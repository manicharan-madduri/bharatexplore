package com.tourism.india.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Date;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.Map;
import java.util.function.Function;

@Service
public class JwtService {

    private static final Logger logger = LoggerFactory.getLogger(JwtService.class);
    public static final String CREDENTIAL_FINGERPRINT_CLAIM = "pwd_fp";
    private static final int MIN_KEY_BYTES = 32; // 256 bits required for HS256

    @Value("${application.security.jwt.secret-key:}")
    private String secretKey;

    @Value("${application.security.jwt.expiration:86400000}")
    private long jwtExpiration;

    @Autowired(required = false)
    private Environment environment;

    @PostConstruct
    public void validateConfiguration() {
        boolean isProdProfile = false;
        if (environment != null) {
            isProdProfile = Arrays.stream(environment.getActiveProfiles())
                    .anyMatch(p -> "prod".equalsIgnoreCase(p) || "production".equalsIgnoreCase(p));
        }

        if (secretKey == null || secretKey.isBlank()) {
            throw new IllegalStateException(
                    "JWT signing secret is not configured. Set the JWT_SECRET_KEY environment variable " +
                    "(or application.security.jwt.secret-key)."
            );
        }

        byte[] keyBytes = decodeAndValidateKeyBytes(secretKey);
        if (isProdProfile) {
            logger.info("JWT signing configuration validated for production profile ({} bits).", keyBytes.length * 8);
        } else {
            logger.debug("JWT signing configuration validated ({} bits).", keyBytes.length * 8);
        }
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    public String generateToken(UserDetails userDetails) {
        return generateToken(new HashMap<>(), userDetails);
    }

    public String generateToken(UserDetails userDetails, long expirationMs) {
        return buildToken(new HashMap<>(), userDetails, expirationMs);
    }

    public String generateToken(Map<String, Object> extraClaims, UserDetails userDetails) {
        return buildToken(extraClaims, userDetails, jwtExpiration);
    }

    private String buildToken(Map<String, Object> extraClaims, UserDetails userDetails, long expiration) {
        Map<String, Object> claims = new HashMap<>();
        if (extraClaims != null) {
            claims.putAll(extraClaims);
        }
        String fingerprint = computeCredentialFingerprint(userDetails);
        if (!fingerprint.isEmpty()) {
            claims.put(CREDENTIAL_FINGERPRINT_CLAIM, fingerprint);
        }

        return Jwts
                .builder()
                .claims(claims)
                .subject(userDetails.getUsername())
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSignInKey(), Jwts.SIG.HS256)
                .compact();
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        if (token == null || token.isBlank() || userDetails == null) {
            return false;
        }
        if (!userDetails.isEnabled()
                || !userDetails.isAccountNonLocked()
                || !userDetails.isAccountNonExpired()
                || !userDetails.isCredentialsNonExpired()) {
            return false;
        }

        final Claims claims = extractAllClaims(token);
        final String username = claims.getSubject();
        if (username == null || !username.equals(userDetails.getUsername())) {
            return false;
        }

        final Date expiration = claims.getExpiration();
        if (expiration == null || expiration.before(new Date())) {
            return false;
        }

        String expectedFingerprint = computeCredentialFingerprint(userDetails);
        if (!expectedFingerprint.isEmpty()) {
            String tokenFingerprint = claims.get(CREDENTIAL_FINGERPRINT_CLAIM, String.class);
            if (tokenFingerprint == null || !MessageDigest.isEqual(
                    tokenFingerprint.getBytes(StandardCharsets.UTF_8),
                    expectedFingerprint.getBytes(StandardCharsets.UTF_8))) {
                return false;
            }
        }

        return true;
    }

    /**
     * Computes a non-reversible 128-bit HMAC-SHA256 fingerprint over the user's current
     * password hash using the server signing key. Never exposes the password hash itself,
     * and changes immediately whenever the user's password is changed or reset.
     */
    public String computeCredentialFingerprint(UserDetails userDetails) {
        if (userDetails == null || userDetails.getPassword() == null || userDetails.getPassword().isBlank()) {
            return "";
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(getSignInKey());
            byte[] digest = mac.doFinal(userDetails.getPassword().getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest, 0, 16);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Failed to compute credential fingerprint", e);
        }
    }

    private Claims extractAllClaims(String token) {
        return Jwts
                .parser()
                .verifyWith(getSignInKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey getSignInKey() {
        byte[] keyBytes = decodeAndValidateKeyBytes(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    private static byte[] decodeAndValidateKeyBytes(String configuredKey) {
        if (configuredKey == null || configuredKey.isBlank()) {
            throw new IllegalStateException("JWT signing secret is not configured.");
        }
        byte[] keyBytes;
        try {
            keyBytes = Decoders.BASE64.decode(configuredKey.trim());
        } catch (Exception ex) {
            throw new IllegalStateException("JWT signing secret must be valid Base64.", ex);
        }
        if (keyBytes.length < MIN_KEY_BYTES) {
            throw new IllegalStateException(
                    "JWT signing secret is too weak: must decode to at least 256 bits (32 bytes) for HS256."
            );
        }
        return keyBytes;
    }
}

