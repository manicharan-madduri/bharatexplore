package com.tourism.india.controller;

import com.tourism.india.dto.ApiResponse;
import com.tourism.india.dto.ChangePasswordRequest;
import com.tourism.india.dto.UpdateProfileRequest;
import com.tourism.india.dto.UserDto;
import com.tourism.india.entity.User;
import com.tourism.india.repository.PasswordResetTokenRepository;
import com.tourism.india.repository.UserRepository;
import com.tourism.india.security.JwtService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/account")
public class AccountController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordResetTokenRepository tokenRepository;
    private final JwtService jwtService;

    @Value("${application.security.jwt.expiration:86400000}")
    private int jwtExpirationMs;

    @Value("${application.security.jwt.cookie-secure:false}")
    private boolean jwtCookieSecure;

    @Value("${application.security.jwt.cookie-same-site:Lax}")
    private String jwtCookieSameSite = "Lax";

    public AccountController(UserRepository userRepository,
                             PasswordEncoder passwordEncoder,
                             PasswordResetTokenRepository tokenRepository,
                             JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenRepository = tokenRepository;
        this.jwtService = jwtService;
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserDto>> getCurrentUser(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Not authenticated"));
        }
        UserDto dto = new UserDto(user.getId(), user.getUsername(), user.getEmail(), user.getPhoneNumber(), user.getRole().name());
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    @PutMapping("/update")
    @Transactional
    public ResponseEntity<ApiResponse<UserDto>> updateProfile(
            @Valid @RequestBody UpdateProfileRequest request,
            @AuthenticationPrincipal User user,
            HttpServletResponse response) {
        
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Not authenticated"));
        }

        String trimmedUsername = request.getUsername().trim();
        String trimmedEmail = request.getEmail().trim().toLowerCase();
        boolean usernameChanged = !user.getUsername().equals(trimmedUsername);

        if (usernameChanged && userRepository.existsByUsername(trimmedUsername)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Username is already taken"));
        }

        if (!user.getEmail().equalsIgnoreCase(trimmedEmail) && userRepository.existsByEmail(trimmedEmail)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Email is already registered"));
        }

        String normalizedPhone = AuthController.normalizePhoneNumber(request.getPhoneNumber());
        if (!AuthController.isValidPhoneNumber(normalizedPhone)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid phone number format. Please enter 7 to 15 digits (e.g., +91 9876543210)."));
        }

        user.setUsername(trimmedUsername);
        user.setEmail(trimmedEmail);
        user.setPhoneNumber(normalizedPhone);

        userRepository.save(user);

        // Reissue JWT cookie if the subject (username) changed so the session remains valid
        if (usernameChanged) {
            String newJwt = jwtService.generateToken(user);
            setJwtCookie(response, newJwt);
        }

        UserDto dto = new UserDto(user.getId(), user.getUsername(), user.getEmail(), user.getPhoneNumber(), user.getRole().name());
        return ResponseEntity.ok(ApiResponse.success("Profile updated successfully", dto));
    }

    @PutMapping("/change-password")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            @AuthenticationPrincipal User user,
            HttpServletResponse response) {
        
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Not authenticated"));
        }

        if (request == null || request.getCurrentPassword() == null || request.getCurrentPassword().isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Current password is required"));
        }

        if (request.getCurrentPassword().length() > 128) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Password cannot exceed 128 characters"));
        }

        if (!AuthController.isValidPasswordLength(request.getNewPassword())) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Password must be between 8 and 72 characters long"));
        }

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Incorrect current password"));
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        
        // Log out user after password change
        clearJwtCookie(response);
        
        return ResponseEntity.ok(ApiResponse.success("Password changed successfully. Please log in again.", null));
    }

    @PostMapping("/deactivate")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> deactivateAccount(
            @RequestBody(required = false) ChangePasswordRequest request,
            @AuthenticationPrincipal User user,
            HttpServletResponse response) {
        
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Not authenticated"));
        }

        if (request == null || request.getCurrentPassword() == null || request.getCurrentPassword().isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Current password is required"));
        }

        if (request.getCurrentPassword().length() > 128) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Password cannot exceed 128 characters"));
        }

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Incorrect password"));
        }

        user.setActive(false);
        userRepository.save(user);
        
        clearJwtCookie(response);
        
        return ResponseEntity.ok(ApiResponse.success("Account deactivated successfully.", null));
    }

    @DeleteMapping("/delete")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> deleteAccount(
            @RequestBody(required = false) ChangePasswordRequest request,
            @AuthenticationPrincipal User user,
            HttpServletResponse response) {
        
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Not authenticated"));
        }

        if (request == null || request.getCurrentPassword() == null || request.getCurrentPassword().isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Current password is required"));
        }

        if (request.getCurrentPassword().length() > 128) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Password cannot exceed 128 characters"));
        }

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Incorrect password"));
        }

        tokenRepository.deleteByUser(user);
        userRepository.delete(user);
        
        clearJwtCookie(response);
        
        return ResponseEntity.ok(ApiResponse.success("Account permanently deleted.", null));
    }

    private void setJwtCookie(HttpServletResponse response, String jwt) {
        Cookie cookie = new Cookie("jwt", jwt);
        cookie.setHttpOnly(true);
        cookie.setSecure(jwtCookieSecure);
        cookie.setPath("/");
        cookie.setMaxAge(jwtExpirationMs / 1000);
        cookie.setAttribute("SameSite", resolveSameSite());
        response.addCookie(cookie);
    }

    private void clearJwtCookie(HttpServletResponse response) {
        Cookie cookie = new Cookie("jwt", null);
        cookie.setHttpOnly(true);
        cookie.setSecure(jwtCookieSecure);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        cookie.setAttribute("SameSite", resolveSameSite());
        response.addCookie(cookie);
    }

    private String resolveSameSite() {
        return (jwtCookieSameSite != null && !jwtCookieSameSite.isBlank())
                ? jwtCookieSameSite.trim()
                : "Lax";
    }
}

