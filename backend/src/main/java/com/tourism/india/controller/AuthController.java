package com.tourism.india.controller;

import com.tourism.india.dto.*;
import com.tourism.india.entity.PasswordResetToken;
import com.tourism.india.entity.Role;
import com.tourism.india.entity.User;
import com.tourism.india.repository.PasswordResetTokenRepository;
import com.tourism.india.repository.UserRepository;
import com.tourism.india.security.AuthRateLimitService;
import com.tourism.india.security.JwtService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);
    private static final long REMEMBER_ME_EXPIRATION_MS = 7L * 24 * 60 * 60 * 1000; // 7 days
    private static final Pattern PHONE_PATTERN = Pattern.compile("^\\+?[0-9]{7,15}$");
    private static final String DEFAULT_FRONTEND_URL = "http://localhost:5173";
    public static final String RATE_LIMIT_EXCEEDED_MESSAGE =
            "Too many requests. Please wait before trying again.";

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private AuthRateLimitService authRateLimitService;

    @Value("${application.security.jwt.expiration:86400000}")
    private int jwtExpirationMs;

    @Value("${application.security.jwt.cookie-secure:false}")
    private boolean jwtCookieSecure;

    @Value("${application.security.jwt.cookie-same-site:Lax}")
    private String jwtCookieSameSite = "Lax";

    @Value("${application.frontend-url:http://localhost:5173}")
    private String frontendBaseUrl = DEFAULT_FRONTEND_URL;

    @Value("${application.security.password-reset.log-link-in-dev:false}")
    private boolean logResetLinkInDev = false;

    public AuthController(AuthenticationManager authenticationManager,
                          UserRepository userRepository,
                          PasswordResetTokenRepository tokenRepository,
                          PasswordEncoder passwordEncoder,
                          JwtService jwtService) {
        this(authenticationManager, userRepository, tokenRepository, passwordEncoder, jwtService, new AuthRateLimitService());
    }

    @Autowired
    public AuthController(AuthenticationManager authenticationManager,
                          UserRepository userRepository,
                          PasswordResetTokenRepository tokenRepository,
                          PasswordEncoder passwordEncoder,
                          JwtService jwtService,
                          AuthRateLimitService authRateLimitService) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.tokenRepository = tokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authRateLimitService = authRateLimitService != null ? authRateLimitService : new AuthRateLimitService();
    }

    public static String normalizePhoneNumber(String rawPhone) {
        if (rawPhone == null) {
            return null;
        }
        String cleaned = rawPhone.trim().replaceAll("[\\s\\-().]", "");
        return cleaned.isEmpty() ? null : cleaned;
    }

    public static boolean isValidPhoneNumber(String normalizedPhone) {
        if (normalizedPhone == null || normalizedPhone.isEmpty()) {
            return true;
        }
        return PHONE_PATTERN.matcher(normalizedPhone).matches();
    }

    public static boolean isValidPasswordLength(String password) {
        return password != null && password.length() >= 8 && password.length() <= 72;
    }

    /**
     * Safely builds a password-reset URL using the configured frontend base URL
     * and URL-encoded query parameters.
     */
    public static String buildPasswordResetUrl(String baseUrl, String rawToken, String email) {
        String normalizedBase = (baseUrl == null || baseUrl.isBlank())
                ? DEFAULT_FRONTEND_URL
                : baseUrl.trim().replaceAll("/+$", "");
        if (normalizedBase.isEmpty()) {
            normalizedBase = DEFAULT_FRONTEND_URL;
        }
        String encodedToken = URLEncoder.encode(rawToken != null ? rawToken : "", StandardCharsets.UTF_8);
        String encodedEmail = URLEncoder.encode(email != null ? email : "", StandardCharsets.UTF_8);
        return normalizedBase + "/reset-password?token=" + encodedToken + "&email=" + encodedEmail;
    }

    public ResponseEntity<ApiResponse<AuthResponse>> register(
            RegisterRequest request,
            HttpServletResponse response) {
        return register(request, null, response);
    }

    @PostMapping("/register")
    @Transactional
    public ResponseEntity<ApiResponse<AuthResponse>> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse response) {

        ResponseEntity<ApiResponse<AuthResponse>> rateLimited = checkRateLimitOrReject(AuthRateLimitService.ACTION_REGISTER, httpRequest);
        if (rateLimited != null) {
            return rateLimited;
        }

        if (request == null || !isValidPasswordLength(request.getPassword())) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Password must be between 8 and 72 characters long"));
        }

        String trimmedUsername = request.getUsername().trim();
        String trimmedEmail = request.getEmail().trim().toLowerCase();

        if (userRepository.existsByUsername(trimmedUsername)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Username is already taken"));
        }
        
        if (userRepository.existsByEmail(trimmedEmail)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Email is already registered"));
        }

        // Normalize and validate phone number format (supports spaces, hyphens, parentheses)
        String normalizedPhone = normalizePhoneNumber(request.getPhoneNumber());
        if (!isValidPhoneNumber(normalizedPhone)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid phone number format. Please enter 7 to 15 digits (e.g., +91 9876543210)."));
        }

        User user = new User(
                trimmedUsername,
                trimmedEmail,
                passwordEncoder.encode(request.getPassword()),
                normalizedPhone,
                Role.USER
        );

        userRepository.save(user);

        String jwt = jwtService.generateToken(user);
        setJwtCookie(response, jwt, jwtExpirationMs);

        UserDto userDto = new UserDto(user.getId(), user.getUsername(), user.getEmail(), user.getPhoneNumber(), user.getRole().name());
        return ResponseEntity.ok(ApiResponse.success("Registration successful", new AuthResponse(userDto)));
    }

    public ResponseEntity<ApiResponse<AuthResponse>> login(
            LoginRequest request,
            HttpServletResponse response) {
        return login(request, null, response);
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse response) {

        ResponseEntity<ApiResponse<AuthResponse>> rateLimited = checkRateLimitOrReject(AuthRateLimitService.ACTION_LOGIN, httpRequest);
        if (rateLimited != null) {
            return rateLimited;
        }

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsernameOrEmail().trim(), request.getPassword())
            );

            User user = (User) authentication.getPrincipal();
            
            if (!user.isActive()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.error("Account is deactivated. Please contact support."));
            }

            long effectiveExpirationMs = request.isRememberMe() ? REMEMBER_ME_EXPIRATION_MS : jwtExpirationMs;
            String jwt = jwtService.generateToken(user, effectiveExpirationMs);
            setJwtCookie(response, jwt, effectiveExpirationMs);

            UserDto userDto = new UserDto(user.getId(), user.getUsername(), user.getEmail(), user.getPhoneNumber(), user.getRole().name());
            return ResponseEntity.ok(ApiResponse.success("Login successful", new AuthResponse(userDto)));

        } catch (DisabledException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("Account is deactivated. Please contact support."));
        } catch (BadCredentialsException e) {
            // Generic message to prevent enumeration
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Invalid username/email or password"));
        } catch (AuthenticationException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Invalid username/email or password"));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(HttpServletResponse response) {
        Cookie cookie = new Cookie("jwt", null);
        cookie.setHttpOnly(true);
        cookie.setSecure(jwtCookieSecure);
        cookie.setPath("/");
        cookie.setMaxAge(0); // clear cookie
        cookie.setAttribute("SameSite", resolveSameSite());
        response.addCookie(cookie);
        return ResponseEntity.ok(ApiResponse.success("Logged out successfully", null));
    }

    public ResponseEntity<ApiResponse<Void>> forgotPassword(ForgotPasswordRequest request) {
        return forgotPassword(request, null);
    }

    @PostMapping("/forgot-password")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request,
            HttpServletRequest httpRequest) {

        ResponseEntity<ApiResponse<Void>> rateLimited = checkRateLimitOrReject(AuthRateLimitService.ACTION_FORGOT_PASSWORD, httpRequest);
        if (rateLimited != null) {
            return rateLimited;
        }

        Optional<User> userOpt = userRepository.findByEmail(request.getEmail().trim());
        
        // We always return success to prevent email enumeration attacks
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            
            // Delete any existing tokens for this user
            tokenRepository.deleteByUser(user);

            // Generate raw token
            String rawToken = UUID.randomUUID().toString();
            // Hash token for storage
            String hashedToken = passwordEncoder.encode(rawToken);

            PasswordResetToken resetToken = new PasswordResetToken(
                    hashedToken,
                    user,
                    LocalDateTime.now().plusHours(1)
            );
            tokenRepository.save(resetToken);

            if (logResetLinkInDev) {
                String resetLink = buildPasswordResetUrl(frontendBaseUrl, rawToken, user.getEmail());
                logger.info("Password reset link generated (local dev mode enabled): {}", resetLink);
            } else {
                logger.debug("Password reset token generated and persisted for userId={}", user.getId());
            }
        }

        return ResponseEntity.ok(ApiResponse.success(
                "If an account with that email exists, password reset instructions have been processed.",
                null
        ));
    }

    public ResponseEntity<ApiResponse<Void>> resetPassword(ResetPasswordRequest request) {
        return resetPassword(request, null);
    }

    @PostMapping("/reset-password")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request,
            HttpServletRequest httpRequest) {

        ResponseEntity<ApiResponse<Void>> rateLimited = checkRateLimitOrReject(AuthRateLimitService.ACTION_RESET_PASSWORD, httpRequest);
        if (rateLimited != null) {
            return rateLimited;
        }

        if (request == null || !isValidPasswordLength(request.getNewPassword())) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Password must be between 8 and 72 characters long"));
        }

        Optional<User> userOpt = userRepository.findByEmail(request.getEmail().trim());
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid token or email"));
        }

        User user = userOpt.get();
        Optional<PasswordResetToken> tokenOpt = tokenRepository.findByUser(user);
        
        if (tokenOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid or expired token"));
        }
        
        PasswordResetToken resetToken = tokenOpt.get();
        
        if (resetToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            tokenRepository.delete(resetToken);
            return ResponseEntity.badRequest().body(ApiResponse.error("Token has expired"));
        }
        
        if (!passwordEncoder.matches(request.getToken(), resetToken.getHashedToken())) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid token"));
        }
        
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        
        tokenRepository.delete(resetToken); // invalidate single-use token
        
        return ResponseEntity.ok(ApiResponse.success("Password has been reset successfully", null));
    }

    private <T> ResponseEntity<ApiResponse<T>> checkRateLimitOrReject(String action, HttpServletRequest httpRequest) {
        if (authRateLimitService == null) {
            return null;
        }
        AuthRateLimitService.RateLimitDecision decision = authRateLimitService.checkRateLimit(action, httpRequest);
        if (!decision.allowed()) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .header("Retry-After", String.valueOf(decision.retryAfterSeconds()))
                    .body(ApiResponse.error(RATE_LIMIT_EXCEEDED_MESSAGE));
        }
        return null;
    }

    private void setJwtCookie(HttpServletResponse response, String jwt, long expirationMs) {
        Cookie cookie = new Cookie("jwt", jwt);
        cookie.setHttpOnly(true);
        cookie.setSecure(jwtCookieSecure);
        cookie.setPath("/");
        cookie.setMaxAge((int) (expirationMs / 1000L));
        cookie.setAttribute("SameSite", resolveSameSite());
        response.addCookie(cookie);
    }

    private String resolveSameSite() {
        return (jwtCookieSameSite != null && !jwtCookieSameSite.isBlank())
                ? jwtCookieSameSite.trim()
                : "Lax";
    }
}

