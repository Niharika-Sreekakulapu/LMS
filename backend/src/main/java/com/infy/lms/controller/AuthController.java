package com.infy.lms.controller;

import com.infy.lms.dto.*;
import com.infy.lms.exception.BadRequestException;
import com.infy.lms.model.ApiToken;
import com.infy.lms.repository.ApiTokenRepository;
import com.infy.lms.repository.UserRepository;
import com.infy.lms.service.AuthService;
import com.infy.lms.service.FileStorageService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;


@RequiredArgsConstructor
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final FileStorageService fileStorageService;
    private final AuthenticationConfiguration authenticationConfiguration;
    private final com.infy.lms.repository.ApiTokenRepository apiTokenRepository;
    private final com.infy.lms.repository.UserRepository userRepository;
    private final AuthenticationManager authenticationManager;
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(AuthController.class);


    private String generateTokenValue() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }


    // ---------- existing endpoints (register / forgot / reset) ----------
    @PostMapping("/register")
    public ResponseEntity<ApiMessageResponse> registerUser(
            @Valid @ModelAttribute RegistrationRequest request,
            BindingResult bindingResult,
            @RequestPart(value = "idProof", required = false) MultipartFile idProof
    ) {
        if (bindingResult.hasErrors()) {
            String err = bindingResult.getFieldErrors().stream()
                    .map(f -> f.getField() + ": " + f.getDefaultMessage())
                    .reduce((a, b) -> a + "; " + b).orElse("Validation error");
            throw new BadRequestException(err);
        }

        String storedPath = null;
        if (idProof != null && !idProof.isEmpty()) {
            storedPath = fileStorageService.storeFile(idProof);
        }

        authService.registerUser(request, storedPath);
        ApiMessageResponse resp = new ApiMessageResponse("Registration successful. Pending admin approval.", java.time.Instant.now());
        return ResponseEntity.status(HttpStatus.CREATED).body(resp);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiMessageResponse> forgotPassword(@Valid @RequestBody ForgotPasswordRequest req) {
        // service will now build the frontend reset link using configured frontend URL
        authService.createPasswordResetToken(req.getEmail());
        ApiMessageResponse resp = new ApiMessageResponse("If that email exists, a reset link has been sent.", java.time.Instant.now());
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiMessageResponse> resetPassword(@Valid @RequestBody ResetPasswordRequest req) {
        authService.resetPassword(req.getToken(), req.getNewPassword());
        ApiMessageResponse resp = new ApiMessageResponse("Password updated successfully.", java.time.Instant.now());
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/profile")
    public ResponseEntity<UserSummaryDto> getProfile(Authentication authentication) {
        String email = authentication.getName();
        UserSummaryDto summary = authService.getUserSummaryByEmail(email);
        return ResponseEntity.ok(summary);
    }

    @PutMapping("/profile")
    public ResponseEntity<UserSummaryDto> updateProfile(
            Authentication authentication,
            @RequestBody java.util.Map<String, Object> updates) {
        String email = authentication.getName();
        authService.updateUserProfile(email, updates);
        // Return updated profile
        UserSummaryDto summary = authService.getUserSummaryByEmail(email);
        return ResponseEntity.ok(summary);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest body, HttpServletRequest request) {
        try {
            // Authenticate using injected AuthenticationManager
            Authentication auth = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(body.getEmail(), body.getPassword())
            );

            // Set SecurityContext for current request thread only (do NOT persist complex objects in session)
            SecurityContext ctx = SecurityContextHolder.createEmptyContext();
            ctx.setAuthentication(auth);
            SecurityContextHolder.setContext(ctx);

            // Build DTO summary (must be DTO-only)
            UserSummaryDto summary = authService.getUserSummaryByEmail(body.getEmail());

            // Validate that the provided role matches the user's actual role
            if (body.getRole() != null && !body.getRole().trim().isEmpty()) {
                String userRole = summary.getRole().name();
                String providedRole = body.getRole().toUpperCase();
                if (!userRole.equals(providedRole)) {
                    ApiMessageResponse resp = new ApiMessageResponse("Invalid credentials", java.time.Instant.now());
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(resp);
                }
            }


            // Create and persist API token row
            String tokenValue = generateTokenValue();
            ApiToken apiToken = new ApiToken();
            apiToken.setToken(tokenValue);

            var userEntity = userRepository.findByEmail(body.getEmail())
                    .orElseThrow(() -> new UsernameNotFoundException("User not found: " + body.getEmail()));
            apiToken.setUser(userEntity);

            apiToken.setIssuedAt(Instant.now());
            apiToken.setExpiresAt(Instant.now().plus(Duration.ofDays(30)));

            log.debug("[LOGIN] About to save ApiToken for userId={} tokenPreview={}", userEntity.getId(),
                    tokenValue == null ? "<null>" : tokenValue.length() > 12 ? tokenValue.substring(0,12) + "..." : tokenValue);

            try {
                apiTokenRepository.save(apiToken);
                log.debug("[LOGIN] ApiToken saved successfully for token={} userId={}", apiToken.getToken(), userEntity.getId());
            } catch (Throwable t) {
                // DON'T log full throwable (it can trigger cycles). Log only small, safe info.
                log.error("[LOGIN] ApiToken save failed: {}: {}", t.getClass().getName(), t.getMessage());
                // continue without persisting token so login response can still be returned for debugging
            }

            // Build DTO response and return (NO entities inside)
            LoginResponse resp = new LoginResponse(tokenValue, summary, apiToken.getExpiresAt());
            return ResponseEntity.ok(resp);


        } catch (BadCredentialsException ex) {
            ApiMessageResponse resp = new ApiMessageResponse("Invalid credentials", java.time.Instant.now());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(resp);
        } catch (DisabledException ex) {
            ApiMessageResponse resp = new ApiMessageResponse("User disabled or not approved", java.time.Instant.now());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(resp);
        } catch (UsernameNotFoundException ex) {
            ApiMessageResponse resp = new ApiMessageResponse("User not found", java.time.Instant.now());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(resp);
        } catch (Exception ex) {
            log.error("Login error: {}: {}", ex.getClass().getName(), ex.getMessage());
            ApiMessageResponse resp = new ApiMessageResponse("Login failed", java.time.Instant.now());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(resp);
        }
    }


}
