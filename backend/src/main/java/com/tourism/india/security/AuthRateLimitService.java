package com.tourism.india.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.util.Comparator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

/**
 * Lightweight, thread-safe, bounded in-memory rate limiter for authentication POST endpoints.
 *
 * <p>Note on deployment topology: This limiter stores state in-memory within a single JVM instance.
 * In a multi-instance horizontal deployment behind a load balancer, per-instance limits apply
 * independently unless backed by a shared store (e.g., Redis) or upstream API gateway rate limiting.</p>
 */
@Service
public class AuthRateLimitService {

    public static final String ACTION_LOGIN = "login";
    public static final String ACTION_REGISTER = "register";
    public static final String ACTION_FORGOT_PASSWORD = "forgot-password";
    public static final String ACTION_RESET_PASSWORD = "reset-password";

    private static final Pattern SAFE_IP_PATTERN = Pattern.compile("^[0-9a-fA-F.:%]{2,64}$");

    @Value("${application.security.rate-limit.window-seconds:60}")
    private int windowSeconds = 60;

    @Value("${application.security.rate-limit.max-tracked-keys:4096}")
    private int maxTrackedKeys = 4096;

    @Value("${application.security.rate-limit.trust-forwarded-headers:false}")
    private boolean trustForwardedHeaders = false;

    @Value("${application.security.rate-limit.login-max-requests:10}")
    private int loginMaxRequests = 10;

    @Value("${application.security.rate-limit.register-max-requests:5}")
    private int registerMaxRequests = 5;

    @Value("${application.security.rate-limit.forgot-password-max-requests:5}")
    private int forgotPasswordMaxRequests = 5;

    @Value("${application.security.rate-limit.reset-password-max-requests:5}")
    private int resetPasswordMaxRequests = 5;

    private final ConcurrentHashMap<String, WindowBucket> buckets = new ConcurrentHashMap<>();
    private Clock clock = Clock.systemUTC();

    public void setClock(Clock clock) {
        if (clock != null) {
            this.clock = clock;
        }
    }

    public RateLimitDecision checkRateLimit(String action, HttpServletRequest request) {
        String clientIp = resolveClientIp(request);
        return checkRateLimitForKey(action, clientIp);
    }

    public RateLimitDecision checkRateLimitForKey(String action, String clientIdentifier) {
        String normalizedAction = (action == null || action.isBlank()) ? "auth" : action.trim().toLowerCase();
        String normalizedClient = (clientIdentifier == null || clientIdentifier.isBlank())
                ? "local-client"
                : clientIdentifier.trim();

        int maxRequests = resolveMaxRequestsForAction(normalizedAction);
        long windowMillis = Math.max(1, windowSeconds) * 1000L;
        long nowMillis = clock.millis();

        String compositeKey = normalizedAction + ":" + normalizedClient;
        enforceCapacityBounds(nowMillis, windowMillis, compositeKey);

        WindowBucket bucket = buckets.computeIfAbsent(compositeKey, k -> new WindowBucket(nowMillis));
        return bucket.tryAcquire(maxRequests, windowMillis, nowMillis);
    }

    /**
     * Resolves the client IP address for rate limiting.
     * Ignores X-Forwarded-For and X-Real-IP headers unless trustForwardedHeaders is explicitly enabled.
     */
    public String resolveClientIp(HttpServletRequest request) {
        if (request == null) {
            return "local-client";
        }

        if (trustForwardedHeaders) {
            String xff = request.getHeader("X-Forwarded-For");
            if (xff != null && !xff.isBlank()) {
                String firstHop = xff.split(",")[0].trim();
                if (SAFE_IP_PATTERN.matcher(firstHop).matches()) {
                    return firstHop;
                }
            }
            String xRealIp = request.getHeader("X-Real-IP");
            if (xRealIp != null && !xRealIp.isBlank()) {
                String trimmed = xRealIp.trim();
                if (SAFE_IP_PATTERN.matcher(trimmed).matches()) {
                    return trimmed;
                }
            }
        }

        String remoteAddr = request.getRemoteAddr();
        if (remoteAddr != null && !remoteAddr.isBlank()) {
            return remoteAddr.trim();
        }
        return "local-client";
    }

    public int getTrackedKeyCount() {
        return buckets.size();
    }

    public void clearAll() {
        buckets.clear();
    }

    private int resolveMaxRequestsForAction(String action) {
        return switch (action) {
            case ACTION_LOGIN -> Math.max(1, loginMaxRequests);
            case ACTION_REGISTER -> Math.max(1, registerMaxRequests);
            case ACTION_FORGOT_PASSWORD -> Math.max(1, forgotPasswordMaxRequests);
            case ACTION_RESET_PASSWORD -> Math.max(1, resetPasswordMaxRequests);
            default -> Math.max(1, loginMaxRequests);
        };
    }

    private void enforceCapacityBounds(long nowMillis, long windowMillis, String incomingKey) {
        int cap = Math.max(16, maxTrackedKeys);
        if (buckets.size() < cap || buckets.containsKey(incomingKey)) {
            return;
        }

        synchronized (buckets) {
            if (buckets.size() < cap || buckets.containsKey(incomingKey)) {
                return;
            }
            // First purge all expired window entries
            buckets.entrySet().removeIf(entry -> entry.getValue().isExpired(nowMillis, windowMillis));

            // If still at or above capacity, evict the oldest window entry
            while (buckets.size() >= cap) {
                String oldestKey = buckets.entrySet().stream()
                        .min(Comparator.comparingLong(e -> e.getValue().getWindowStartMillis()))
                        .map(Map.Entry::getKey)
                        .orElse(null);
                if (oldestKey == null) {
                    break;
                }
                buckets.remove(oldestKey);
            }
        }
    }

    public record RateLimitDecision(boolean allowed, long retryAfterSeconds, int limit, int remaining) {
    }

    private static final class WindowBucket {
        private long windowStartMillis;
        private int count;

        private WindowBucket(long nowMillis) {
            this.windowStartMillis = nowMillis;
            this.count = 0;
        }

        synchronized RateLimitDecision tryAcquire(int maxRequests, long windowMillis, long nowMillis) {
            if (nowMillis - windowStartMillis >= windowMillis) {
                windowStartMillis = nowMillis;
                count = 0;
            }

            if (count >= maxRequests) {
                long elapsedMillis = Math.max(0L, nowMillis - windowStartMillis);
                long remainingMillis = Math.max(1000L, windowMillis - elapsedMillis);
                long retryAfterSeconds = Math.max(1L, (remainingMillis + 999L) / 1000L);
                return new RateLimitDecision(false, retryAfterSeconds, maxRequests, 0);
            }

            count++;
            int remaining = Math.max(0, maxRequests - count);
            return new RateLimitDecision(true, 0L, maxRequests, remaining);
        }

        synchronized boolean isExpired(long nowMillis, long windowMillis) {
            return (nowMillis - windowStartMillis) >= windowMillis;
        }

        synchronized long getWindowStartMillis() {
            return windowStartMillis;
        }
    }
}
