package com.tourism.india.controller;

import com.tourism.india.dto.*;
import com.tourism.india.entity.PasswordResetToken;
import com.tourism.india.entity.Role;
import com.tourism.india.entity.User;
import com.tourism.india.exception.GlobalExceptionHandler;
import com.tourism.india.repository.PasswordResetTokenRepository;
import com.tourism.india.repository.UserRepository;
import com.tourism.india.security.JwtService;
import com.tourism.india.security.SecurityConfig;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthAndAccountControllerTest {

    // Test-only dummy 256-bit Base64 key (32 zero/incrementing bytes encoded in Base64)
    private static final String TEST_ONLY_BASE64_KEY =
            "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=";

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordResetTokenRepository tokenRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @InjectMocks
    private AuthController authController;

    @InjectMocks
    private AccountController accountController;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(authController, "jwtExpirationMs", 86400000);
        ReflectionTestUtils.setField(authController, "jwtCookieSecure", false);
        ReflectionTestUtils.setField(authController, "jwtCookieSameSite", "Lax");
        ReflectionTestUtils.setField(accountController, "jwtExpirationMs", 86400000);
        ReflectionTestUtils.setField(accountController, "jwtCookieSecure", false);
        ReflectionTestUtils.setField(accountController, "jwtCookieSameSite", "Lax");
    }

    @Test
    void testPhoneNumberNormalizationAndValidation() {
        assertEquals("+919876543210", AuthController.normalizePhoneNumber("+91 9876543210"));
        assertEquals("+919876543210", AuthController.normalizePhoneNumber(" +91-98765-43210 "));
        assertEquals("02223456789", AuthController.normalizePhoneNumber("(022) 23456789"));
        assertNull(AuthController.normalizePhoneNumber("   "));
        assertNull(AuthController.normalizePhoneNumber(null));

        assertTrue(AuthController.isValidPhoneNumber("+919876543210"));
        assertTrue(AuthController.isValidPhoneNumber("9876543210"));
        assertTrue(AuthController.isValidPhoneNumber(null));
        assertFalse(AuthController.isValidPhoneNumber("abc12345"));
        assertFalse(AuthController.isValidPhoneNumber("123"));
    }

    @Test
    void testRegisterWithFormattedPhoneNumber_Success_AndOmitsRawTokenFromBody() {
        RegisterRequest req = new RegisterRequest();
        req.setUsername("traveler_india");
        req.setEmail("traveler@example.com");
        req.setPassword("Password123!");
        req.setPhoneNumber("+91 98765 43210");

        when(userRepository.existsByUsername("traveler_india")).thenReturn(false);
        when(userRepository.existsByEmail("traveler@example.com")).thenReturn(false);
        when(passwordEncoder.encode("Password123!")).thenReturn("hashed-pwd");
        when(jwtService.generateToken(any(User.class))).thenReturn("mock-jwt-token");

        MockHttpServletResponse response = new MockHttpServletResponse();
        ResponseEntity<ApiResponse<AuthResponse>> result = authController.register(req, response);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertNotNull(result.getBody());
        assertTrue(result.getBody().isSuccess());
        assertNull(result.getBody().getData().getToken(), "Raw JWT must not be exposed in JSON response body");
        assertEquals("+919876543210", result.getBody().getData().getUser().getPhoneNumber());

        Cookie jwtCookie = response.getCookie("jwt");
        assertNotNull(jwtCookie);
        assertTrue(jwtCookie.isHttpOnly());
        assertFalse(jwtCookie.getSecure());
        assertEquals("Lax", jwtCookie.getAttribute("SameSite"));
    }

    @Test
    void testLoginDeactivatedAccount_Returns403Forbidden() {
        LoginRequest req = new LoginRequest();
        req.setUsernameOrEmail("deactivated_user");
        req.setPassword("Password123!");

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new DisabledException("User is disabled"));

        MockHttpServletResponse response = new MockHttpServletResponse();
        ResponseEntity<ApiResponse<AuthResponse>> result = authController.login(req, response);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        assertNotNull(result.getBody());
        assertFalse(result.getBody().isSuccess());
        assertEquals("Account is deactivated. Please contact support.", result.getBody().getMessage());
    }

    @Test
    void testLoginRememberMe_ExtendsCookieMaxAgeToSevenDays_AndHonorsCookieSecurityConfig() {
        ReflectionTestUtils.setField(authController, "jwtCookieSecure", true);
        ReflectionTestUtils.setField(authController, "jwtCookieSameSite", "Strict");

        User activeUser = new User("explorer", "explorer@example.com", "hashed", null, Role.USER);
        activeUser.setId(10L);

        LoginRequest req = new LoginRequest();
        req.setUsernameOrEmail("explorer");
        req.setPassword("Password123!");
        req.setRememberMe(true);

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(new UsernamePasswordAuthenticationToken(activeUser, null, activeUser.getAuthorities()));
        when(jwtService.generateToken(eq(activeUser), eq(604800000L))).thenReturn("remember-me-jwt");

        MockHttpServletResponse response = new MockHttpServletResponse();
        ResponseEntity<ApiResponse<AuthResponse>> result = authController.login(req, response);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertNotNull(result.getBody());
        assertNull(result.getBody().getData().getToken(), "Raw JWT must not be exposed in JSON response body");

        Cookie jwtCookie = response.getCookie("jwt");
        assertNotNull(jwtCookie);
        assertEquals(604800, jwtCookie.getMaxAge());
        assertEquals("remember-me-jwt", jwtCookie.getValue());
        assertTrue(jwtCookie.isHttpOnly());
        assertTrue(jwtCookie.getSecure());
        assertEquals("Strict", jwtCookie.getAttribute("SameSite"));
    }

    @Test
    void testUpdateProfile_UsernameChanged_ReissuesJwtCookie() {
        User currentUser = new User("old_username", "user@example.com", "hashed", null, Role.USER);
        currentUser.setId(5L);

        UpdateProfileRequest req = new UpdateProfileRequest();
        req.setUsername("new_username");
        req.setEmail("user@example.com");
        req.setPhoneNumber("+91 9876543210");

        when(userRepository.existsByUsername("new_username")).thenReturn(false);
        when(jwtService.generateToken(currentUser)).thenReturn("reissued-jwt-token");

        MockHttpServletResponse response = new MockHttpServletResponse();
        ResponseEntity<ApiResponse<UserDto>> result = accountController.updateProfile(req, currentUser, response);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals("new_username", result.getBody().getData().getUsername());
        assertEquals("+919876543210", result.getBody().getData().getPhoneNumber());

        Cookie jwtCookie = response.getCookie("jwt");
        assertNotNull(jwtCookie);
        assertEquals("reissued-jwt-token", jwtCookie.getValue());
        assertTrue(jwtCookie.isHttpOnly());
    }

    @Test
    void testForgotPassword_DeletesExistingTokenAndSavesNewToken() {
        User user = new User("traveler", "traveler@example.com", "hashed", null, Role.USER);
        ForgotPasswordRequest req = new ForgotPasswordRequest();
        req.setEmail("traveler@example.com");

        when(userRepository.findByEmail("traveler@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.encode(anyString())).thenReturn("hashed-reset-token");

        ResponseEntity<ApiResponse<Void>> result = authController.forgotPassword(req);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(tokenRepository).deleteByUser(user);
        ArgumentCaptor<PasswordResetToken> captor = ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(tokenRepository).save(captor.capture());
        assertEquals(user, captor.getValue().getUser());
    }

    @Test
    void testJwtService_KeyStrengthValidation_RejectsMissingOrWeakSecrets() {
        JwtService serviceWithNull = new JwtService();
        ReflectionTestUtils.setField(serviceWithNull, "secretKey", null);
        assertThrows(IllegalStateException.class, serviceWithNull::validateConfiguration);

        JwtService serviceWithBlank = new JwtService();
        ReflectionTestUtils.setField(serviceWithBlank, "secretKey", "   ");
        assertThrows(IllegalStateException.class, serviceWithBlank::validateConfiguration);

        // 16 bytes in Base64 (< 32 bytes required for HS256)
        JwtService serviceWithWeakKey = new JwtService();
        ReflectionTestUtils.setField(serviceWithWeakKey, "secretKey", "AAECAwQFBgcICQoLDA0ODw==");
        assertThrows(IllegalStateException.class, serviceWithWeakKey::validateConfiguration);

        // Invalid Base64
        JwtService serviceWithBadBase64 = new JwtService();
        ReflectionTestUtils.setField(serviceWithBadBase64, "secretKey", "not-valid-base64!!!");
        assertThrows(IllegalStateException.class, serviceWithBadBase64::validateConfiguration);

        // Production profile with missing secret fails safely at startup
        JwtService prodServiceMissingSecret = new JwtService();
        org.springframework.mock.env.MockEnvironment prodEnv = new org.springframework.mock.env.MockEnvironment();
        prodEnv.setActiveProfiles("prod");
        ReflectionTestUtils.setField(prodServiceMissingSecret, "environment", prodEnv);
        ReflectionTestUtils.setField(prodServiceMissingSecret, "secretKey", "");
        assertThrows(IllegalStateException.class, prodServiceMissingSecret::validateConfiguration);

        // Valid 256-bit Base64 secret succeeds in both dev and prod profiles
        JwtService validService = new JwtService();
        ReflectionTestUtils.setField(validService, "environment", prodEnv);
        ReflectionTestUtils.setField(validService, "secretKey", TEST_ONLY_BASE64_KEY);
        assertDoesNotThrow(validService::validateConfiguration);
    }

    @Test
    void testJwtService_InvalidatesTokenWhenAccountDisabledOrPasswordChanged() {
        JwtService realJwtService = new JwtService();
        ReflectionTestUtils.setField(realJwtService, "secretKey", TEST_ONLY_BASE64_KEY);
        ReflectionTestUtils.setField(realJwtService, "jwtExpiration", 86400000L);
        realJwtService.validateConfiguration();

        User user = new User("secure_user", "secure@example.com", "$2a$10$originalPasswordHashValue123456", null, Role.USER);
        String token = realJwtService.generateToken(user);

        // Token is valid for active user with original password hash
        assertTrue(realJwtService.isTokenValid(token, user));

        // Fingerprint must not equal or contain raw BCrypt hash
        String fpClaim = realJwtService.extractClaim(token, claims -> claims.get(JwtService.CREDENTIAL_FINGERPRINT_CLAIM, String.class));
        assertNotNull(fpClaim);
        assertFalse(fpClaim.contains("$2a$"));
        assertNotEquals(user.getPassword(), fpClaim);

        // Deactivating account immediately invalidates existing token
        user.setActive(false);
        assertFalse(realJwtService.isTokenValid(token, user));

        // Reactivating account but changing password hash immediately invalidates old token
        user.setActive(true);
        user.setPasswordHash("$2a$10$updatedPasswordHashAfterReset999999");
        assertFalse(realJwtService.isTokenValid(token, user));

        // Newly issued token after password change is valid
        String newToken = realJwtService.generateToken(user);
        assertTrue(realJwtService.isTokenValid(newToken, user));
    }

    @Test
    void testGlobalExceptionHandler_DoesNotLeakInternalExceptionMessage() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler();
        RuntimeException sensitiveException = new RuntimeException("JDBC SQL syntax error near secret_table at line 42");
        org.springframework.mock.web.MockHttpServletRequest request =
                new org.springframework.mock.web.MockHttpServletRequest("GET", "/api/states");

        ResponseEntity<ErrorResponse> response = handler.handleGlobalException(sensitiveException, request);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(GlobalExceptionHandler.GENERIC_SERVER_ERROR_MESSAGE, response.getBody().getMessage());
        assertFalse(response.getBody().getMessage().contains("JDBC"));
        assertFalse(response.getBody().getMessage().contains("secret_table"));
    }

    @Test
    void testAccountController_DeactivateAndDeleteRequireNonBlankPassword_Return400Not500() {
        User currentUser = new User("active_user", "active@example.com", "hashed-pwd", null, Role.USER);
        MockHttpServletResponse servletResponse = new MockHttpServletResponse();

        // Null body or null currentPassword on deactivateAccount -> 400 Bad Request
        ResponseEntity<ApiResponse<Void>> deactivateNull = accountController.deactivateAccount(null, currentUser, servletResponse);
        assertEquals(HttpStatus.BAD_REQUEST, deactivateNull.getStatusCode());

        ChangePasswordRequest blankReq = new ChangePasswordRequest();
        blankReq.setCurrentPassword("   ");
        ResponseEntity<ApiResponse<Void>> deactivateBlank = accountController.deactivateAccount(blankReq, currentUser, servletResponse);
        assertEquals(HttpStatus.BAD_REQUEST, deactivateBlank.getStatusCode());

        // Null body or blank currentPassword on deleteAccount -> 400 Bad Request
        ResponseEntity<ApiResponse<Void>> deleteNull = accountController.deleteAccount(null, currentUser, servletResponse);
        assertEquals(HttpStatus.BAD_REQUEST, deleteNull.getStatusCode());

        ResponseEntity<ApiResponse<Void>> deleteBlank = accountController.deleteAccount(blankReq, currentUser, servletResponse);
        assertEquals(HttpStatus.BAD_REQUEST, deleteBlank.getStatusCode());

        verifyNoInteractions(passwordEncoder);
    }

    @Test
    void testPasswordLengthBounds_RejectOver72Characters() {
        String over72Password = "A".repeat(73);
        MockHttpServletResponse response = new MockHttpServletResponse();

        RegisterRequest registerReq = new RegisterRequest();
        registerReq.setUsername("user1");
        registerReq.setEmail("u1@example.com");
        registerReq.setPassword(over72Password);
        ResponseEntity<ApiResponse<AuthResponse>> regResult = authController.register(registerReq, response);
        assertEquals(HttpStatus.BAD_REQUEST, regResult.getStatusCode());

        User currentUser = new User("user1", "u1@example.com", "hashed-pwd", null, Role.USER);
        ChangePasswordRequest changeReq = new ChangePasswordRequest();
        changeReq.setCurrentPassword("ValidPass123!");
        changeReq.setNewPassword(over72Password);
        ResponseEntity<ApiResponse<Void>> changeResult = accountController.changePassword(changeReq, currentUser, response);
        assertEquals(HttpStatus.BAD_REQUEST, changeResult.getStatusCode());
    }

    @Test
    void testSecurityConfig_ParseAllowedOrigins_UsesConfiguredList() {
        List<String> origins = SecurityConfig.parseAllowedOrigins("https://bharatexplore.in, https://www.bharatexplore.in ");
        assertEquals(List.of("https://bharatexplore.in", "https://www.bharatexplore.in"), origins);

        List<String> fallbackOrigins = SecurityConfig.parseAllowedOrigins("   ");
        assertTrue(fallbackOrigins.contains("http://localhost:5173"));
    }

    @Test
    void testPasswordResetUrlBuilder_EncodesParametersAndUsesConfiguredFrontendUrl() {
        String url = AuthController.buildPasswordResetUrl(
                "https://bharatexplore.example.com///",
                "sample-token-id",
                "traveler+india@example.com"
        );
        assertEquals(
                "https://bharatexplore.example.com/reset-password?token=sample-token-id&email=traveler%2Bindia%40example.com",
                url
        );

        String fallbackUrl = AuthController.buildPasswordResetUrl(
                "   ",
                "token-123",
                "user@example.com"
        );
        assertEquals(
                "http://localhost:5173/reset-password?token=token-123&email=user%40example.com",
                fallbackUrl
        );

        // Verify logResetLinkInDev is disabled by default on AuthController instances
        Boolean logInDevDefault = (Boolean) ReflectionTestUtils.getField(authController, "logResetLinkInDev");
        assertEquals(Boolean.FALSE, logInDevDefault);
    }

    @Test
    void testAuthRateLimitService_EnforcesPerIpLimits_IgnoresUntrustedForwardedFor_AndBoundsCapacity() {
        com.tourism.india.security.AuthRateLimitService rateLimiter =
                new com.tourism.india.security.AuthRateLimitService();
        ReflectionTestUtils.setField(rateLimiter, "windowSeconds", 60);
        ReflectionTestUtils.setField(rateLimiter, "loginMaxRequests", 3);
        ReflectionTestUtils.setField(rateLimiter, "forgotPasswordMaxRequests", 2);
        ReflectionTestUtils.setField(rateLimiter, "maxTrackedKeys", 20);
        ReflectionTestUtils.setField(rateLimiter, "trustForwardedHeaders", false);
        ReflectionTestUtils.setField(authController, "authRateLimitService", rateLimiter);

        org.springframework.mock.web.MockHttpServletRequest clientRequest =
                new org.springframework.mock.web.MockHttpServletRequest("POST", "/api/auth/login");
        clientRequest.setRemoteAddr("203.0.113.10");

        LoginRequest loginReq = new LoginRequest();
        loginReq.setUsernameOrEmail("explorer");
        loginReq.setPassword("WrongPass123!");

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new org.springframework.security.authentication.BadCredentialsException("Bad credentials"));

        MockHttpServletResponse response = new MockHttpServletResponse();

        // First 3 login attempts from 203.0.113.10 are allowed through to authentication (returning 401)
        for (int i = 1; i <= 3; i++) {
            // Even if attacker rotates spoofed X-Forwarded-For header, default trustForwardedHeaders=false ignores it
            clientRequest.addHeader("X-Forwarded-For", "198.51.100." + i);
            ResponseEntity<ApiResponse<AuthResponse>> res = authController.login(loginReq, clientRequest, response);
            assertEquals(HttpStatus.UNAUTHORIZED, res.getStatusCode());
        }

        // 4th attempt within the window from the same remoteAddr is rejected with 429 Too Many Requests
        ResponseEntity<ApiResponse<AuthResponse>> throttledLogin = authController.login(loginReq, clientRequest, response);
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, throttledLogin.getStatusCode());
        assertNotNull(throttledLogin.getHeaders().getFirst("Retry-After"));
        assertNotNull(throttledLogin.getBody());
        assertEquals(AuthController.RATE_LIMIT_EXCEEDED_MESSAGE, throttledLogin.getBody().getMessage());

        // Different client IP is not affected by 203.0.113.10's exhausted bucket
        org.springframework.mock.web.MockHttpServletRequest secondClient =
                new org.springframework.mock.web.MockHttpServletRequest("POST", "/api/auth/login");
        secondClient.setRemoteAddr("203.0.113.99");
        ResponseEntity<ApiResponse<AuthResponse>> secondClientRes = authController.login(loginReq, secondClient, response);
        assertEquals(HttpStatus.UNAUTHORIZED, secondClientRes.getStatusCode());

        // Forgot-password endpoint enforces its own limit (2 requests)
        ForgotPasswordRequest forgotReq = new ForgotPasswordRequest();
        forgotReq.setEmail("nobody@example.com");
        when(userRepository.findByEmail("nobody@example.com")).thenReturn(Optional.empty());

        assertEquals(HttpStatus.OK, authController.forgotPassword(forgotReq, secondClient).getStatusCode());
        assertEquals(HttpStatus.OK, authController.forgotPassword(forgotReq, secondClient).getStatusCode());
        ResponseEntity<ApiResponse<Void>> throttledForgot = authController.forgotPassword(forgotReq, secondClient);
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, throttledForgot.getStatusCode());

        // Verify bounded key capacity never exceeds maxTrackedKeys (20) even after 50 distinct IPs
        for (int ip = 1; ip <= 50; ip++) {
            rateLimiter.checkRateLimitForKey(com.tourism.india.security.AuthRateLimitService.ACTION_LOGIN, "10.0.0." + ip);
        }
        assertTrue(rateLimiter.getTrackedKeyCount() <= 20, "Tracked keys must remain bounded by maxTrackedKeys");
    }

    @Test
    void testDatabaseStartupValidator_EnforcesNonRootSslAndValidateDdlInProd_WhilePreservingLocalDev() {
        com.tourism.india.config.DatabaseStartupValidator validator =
                new com.tourism.india.config.DatabaseStartupValidator();

        org.springframework.mock.env.MockEnvironment devEnv = new org.springframework.mock.env.MockEnvironment();
        devEnv.setActiveProfiles("dev");
        ReflectionTestUtils.setField(validator, "environment", devEnv);
        ReflectionTestUtils.setField(validator, "datasourceUrl", "jdbc:mysql://localhost:3306/tourismdb?useSSL=false");
        ReflectionTestUtils.setField(validator, "datasourceUsername", "local_dev_user");
        ReflectionTestUtils.setField(validator, "datasourcePassword", "local_dev_pass");
        ReflectionTestUtils.setField(validator, "ddlAuto", "update");

        // Local dev profile allows update and useSSL=false
        assertDoesNotThrow(validator::validateConfiguration);

        // Destructive create / create-drop modes are rejected even in dev
        ReflectionTestUtils.setField(validator, "ddlAuto", "create-drop");
        assertThrows(IllegalStateException.class, validator::validateConfiguration);
        ReflectionTestUtils.setField(validator, "ddlAuto", "create");
        assertThrows(IllegalStateException.class, validator::validateConfiguration);

        // Switch to production profile
        org.springframework.mock.env.MockEnvironment prodEnv = new org.springframework.mock.env.MockEnvironment();
        prodEnv.setActiveProfiles("prod");
        ReflectionTestUtils.setField(validator, "environment", prodEnv);
        ReflectionTestUtils.setField(validator, "datasourceUrl", "jdbc:mysql://db.example.internal:3306/tourismdb?useSSL=true&requireSSL=true");
        ReflectionTestUtils.setField(validator, "datasourceUsername", "bharatexplore_app");
        ReflectionTestUtils.setField(validator, "datasourcePassword", "strong-prod-placeholder-pass");
        ReflectionTestUtils.setField(validator, "ddlAuto", "validate");

        // Valid production configuration passes
        assertDoesNotThrow(validator::validateConfiguration);

        // Production rejects missing/blank username or password
        ReflectionTestUtils.setField(validator, "datasourceUsername", "");
        assertThrows(IllegalStateException.class, validator::validateConfiguration);
        ReflectionTestUtils.setField(validator, "datasourceUsername", "bharatexplore_app");
        ReflectionTestUtils.setField(validator, "datasourcePassword", "   ");
        assertThrows(IllegalStateException.class, validator::validateConfiguration);
        ReflectionTestUtils.setField(validator, "datasourcePassword", "strong-prod-placeholder-pass");

        // Production rejects MySQL 'root' account
        ReflectionTestUtils.setField(validator, "datasourceUsername", "root");
        assertThrows(IllegalStateException.class, validator::validateConfiguration);
        ReflectionTestUtils.setField(validator, "datasourceUsername", "bharatexplore_app");

        // Production rejects useSSL=false in JDBC URL
        ReflectionTestUtils.setField(validator, "datasourceUrl", "jdbc:mysql://db.example.internal:3306/tourismdb?useSSL=false");
        assertThrows(IllegalStateException.class, validator::validateConfiguration);
        ReflectionTestUtils.setField(validator, "datasourceUrl", "jdbc:mysql://db.example.internal:3306/tourismdb?useSSL=true&requireSSL=true");

        // Production rejects ddl-auto=update
        ReflectionTestUtils.setField(validator, "ddlAuto", "update");
        assertThrows(IllegalStateException.class, validator::validateConfiguration);
    }

    @Test
    void testApplicationYaml_ProdProfileDoesNotFallBackToDevCredentialsAndUsesValidateDdl() throws Exception {
        org.springframework.boot.env.YamlPropertySourceLoader loader =
                new org.springframework.boot.env.YamlPropertySourceLoader();
        org.springframework.core.io.ClassPathResource resource =
                new org.springframework.core.io.ClassPathResource("application.yml");
        List<org.springframework.core.env.PropertySource<?>> sources = loader.load("application.yml", resource);

        assertEquals(3, sources.size(), "application.yml should contain base, dev, and prod profile documents");

        org.springframework.core.env.PropertySource<?> baseDoc = sources.get(0);
        org.springframework.core.env.PropertySource<?> devDoc = sources.get(1);
        org.springframework.core.env.PropertySource<?> prodDoc = sources.get(2);

        assertEquals("dev", String.valueOf(devDoc.getProperty("spring.config.activate.on-profile")));
        assertEquals("optional:classpath:application-local.yml", String.valueOf(devDoc.getProperty("spring.config.import")));
        assertTrue(String.valueOf(prodDoc.getProperty("spring.config.activate.on-profile")).contains("prod"));
        assertNull(prodDoc.getProperty("spring.config.import"), "Prod profile must never import application-local.yml");

        // Verify tracked application.yml has no hardcoded credentials or JWT signing keys in base, dev, or prod documents
        for (org.springframework.core.env.PropertySource<?> doc : sources) {
            assertEquals("${SPRING_DATASOURCE_USERNAME:${DB_USERNAME:}}", String.valueOf(doc.getProperty("spring.datasource.username")));
            assertEquals("${SPRING_DATASOURCE_PASSWORD:${DB_PASSWORD:}}", String.valueOf(doc.getProperty("spring.datasource.password")));
            assertEquals("${JWT_SECRET_KEY:}", String.valueOf(doc.getProperty("application.security.jwt.secret-key")));
        }

        // Verify prod document does NOT fall back to 'root' for username or password
        String prodUsernameExpr = String.valueOf(prodDoc.getProperty("spring.datasource.username"));
        String prodPasswordExpr = String.valueOf(prodDoc.getProperty("spring.datasource.password"));
        assertFalse(prodUsernameExpr.contains("root"), "Prod datasource username must not fall back to root");
        assertFalse(prodPasswordExpr.contains("root"), "Prod datasource password must not fall back to root");

        // Verify prod document enables SSL by default and enforces validate ddl-auto
        String prodUrlExpr = String.valueOf(prodDoc.getProperty("spring.datasource.url"));
        assertTrue(prodUrlExpr.contains("useSSL=${DB_USE_SSL:true}"));
        assertTrue(prodUrlExpr.contains("requireSSL=${DB_REQUIRE_SSL:true}"));
        assertEquals("${SPRING_JPA_DDL_AUTO:validate}", String.valueOf(prodDoc.getProperty("spring.jpa.hibernate.ddl-auto")));
        assertEquals(Boolean.FALSE, prodDoc.getProperty("application.security.password-reset.log-link-in-dev"));

        // Verify full Spring Boot ConfigData resolution for 'prod' and 'production' profiles never imports application-local.yml
        for (String profile : new String[]{"prod", "production"}) {
            org.springframework.mock.env.MockEnvironment resolvedProdEnv = new org.springframework.mock.env.MockEnvironment();
            resolvedProdEnv.setActiveProfiles(profile);
            org.springframework.boot.context.config.ConfigDataEnvironmentPostProcessor.applyTo(resolvedProdEnv);

            assertEquals("", resolvedProdEnv.getProperty("spring.datasource.username", ""),
                    "Profile '" + profile + "' must not fall back to local dev database username");
            assertEquals("", resolvedProdEnv.getProperty("spring.datasource.password", ""),
                    "Profile '" + profile + "' must not fall back to local dev database password");
            assertEquals("", resolvedProdEnv.getProperty("application.security.jwt.secret-key", ""),
                    "Profile '" + profile + "' must not fall back to local dev JWT secret key");

            // Confirm DatabaseStartupValidator and JwtService both fail safely when started with unconfigured prod properties
            com.tourism.india.config.DatabaseStartupValidator dbValidator =
                    new com.tourism.india.config.DatabaseStartupValidator();
            ReflectionTestUtils.setField(dbValidator, "environment", resolvedProdEnv);
            ReflectionTestUtils.setField(dbValidator, "datasourceUrl", resolvedProdEnv.getProperty("spring.datasource.url", ""));
            ReflectionTestUtils.setField(dbValidator, "datasourceUsername", resolvedProdEnv.getProperty("spring.datasource.username", ""));
            ReflectionTestUtils.setField(dbValidator, "datasourcePassword", resolvedProdEnv.getProperty("spring.datasource.password", ""));
            ReflectionTestUtils.setField(dbValidator, "ddlAuto", resolvedProdEnv.getProperty("spring.jpa.hibernate.ddl-auto", "validate"));
            assertThrows(IllegalStateException.class, dbValidator::validateConfiguration);

            JwtService prodJwtService = new JwtService();
            ReflectionTestUtils.setField(prodJwtService, "environment", resolvedProdEnv);
            ReflectionTestUtils.setField(prodJwtService, "secretKey", resolvedProdEnv.getProperty("application.security.jwt.secret-key", ""));
            assertThrows(IllegalStateException.class, prodJwtService::validateConfiguration);
        }
    }
}
