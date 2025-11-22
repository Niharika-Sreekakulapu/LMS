package com.infy.lms.controller;

import com.infy.lms.dto.LoginRequest;
import com.infy.lms.dto.RegistrationRequest;
import com.infy.lms.model.User;
import com.infy.lms.service.AuthService;
import com.infy.lms.exception.UnauthorizedException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegistrationRequest req) {
        User created = authService.register(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(
                java.util.Map.of("id", created.getId(), "email", created.getEmail(), "status", created.getStatus())
        );
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req) {
        User user = authService.authenticate(req);
        return ResponseEntity.ok(java.util.Map.of(
                "id", user.getId(),
                "email", user.getEmail(),
                "name", user.getName(),
                "role", user.getRole(),
                "firstLogin", user.getFirstLogin()
        ));
    }

    /**
     * Minimal admin login endpoint (used by the Admin frontend).
     * Delegates authentication to AuthService then ensures the user has ADMIN role.
     * Returns 200 OK with { "success": true } when valid, otherwise throws UnauthorizedException.
     *
     * Note: keep this small — if you later want tokens, replace the response with a JWT payload.
     */
    @PostMapping("/admin/login")
    public ResponseEntity<?> adminLogin(@Valid @RequestBody LoginRequest req) {
        User user = authService.authenticate(req); // will throw if invalid credentials / not approved

        // ensure admin role
        if (user.getRole() == null || !"ADMIN".equalsIgnoreCase(user.getRole().name())) {
            throw new UnauthorizedException("Not an admin");
        }

        return ResponseEntity.ok(java.util.Map.of("success", true));
    }

    // File upload endpoint will be in AdminController or separate controller (see below)
}
