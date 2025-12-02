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

import java.time.Instant;
import java.time.temporal.ChronoUnit;
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




    // NOTE: frontend URL moved to service layer (per mentor). Controller no longer reads it.

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

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest body, HttpServletRequest request) {
        try {
            AuthenticationManager am = authenticationConfiguration.getAuthenticationManager();

            Authentication auth = am.authenticate(
                    new UsernamePasswordAuthenticationToken(body.getEmail(), body.getPassword())
            );

            // Build a SecurityContext and set the Authentication
            SecurityContext ctx = SecurityContextHolder.createEmptyContext();
            ctx.setAuthentication(auth);
            SecurityContextHolder.setContext(ctx);

            // Ensure HTTP session exists and explicitly persist the SecurityContext into it
            HttpSession session = request.getSession(true); // create if not exists
            session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, ctx);

            // return user summary (same as before)
            UserSummaryDto summary = authService.getUserSummaryByEmail(body.getEmail());
            return ResponseEntity.ok(summary);

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
            ex.printStackTrace();
            ApiMessageResponse resp = new ApiMessageResponse("Login failed", java.time.Instant.now());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(resp);
        }
    }

}
