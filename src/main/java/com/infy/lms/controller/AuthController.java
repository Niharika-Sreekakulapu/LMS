package com.infy.lms.controller;

import com.infy.lms.dto.LoginRequest;
import com.infy.lms.dto.RegistrationRequest;
import com.infy.lms.enums.Role;
import com.infy.lms.model.User;
import com.infy.lms.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Optional;

@RestController // Marks this as a REST controller that handles HTTP requests
@RequestMapping("/api/auth") // Base URL for all endpoints in this controller
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    // Endpoint: POST /api/auth/register
    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody RegistrationRequest request) {
        try {
            // Convert DTO request to the User model object
            User userToRegister = new User();
            userToRegister.setName(request.getName());
            userToRegister.setEmail(request.getEmail());
            userToRegister.setPhone(request.getPhone());
            userToRegister.setRole(request.getRole());
            userToRegister.setPassword(request.getPassword()); // Raw password is sent to service

            User registeredUser = authService.registerUser(userToRegister);

            // Success response (201 Created)
            // Note: We hide the password field before sending the response
            registeredUser.setPassword(null);

            return new ResponseEntity<>(registeredUser, HttpStatus.CREATED);

        } catch (Exception e) {
            // Error response (400 Bad Request)
            return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    // Endpoint: POST /api/auth/login
    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@RequestBody LoginRequest request) {

        Optional<User> userOptional = authService.loginUser(request.getEmail(), request.getPassword());

        if (userOptional.isPresent()) {
            User user = userOptional.get();
            user.setPassword(null); // Hide password before sending
            return new ResponseEntity<>(user, HttpStatus.OK);
        } else {
            return new ResponseEntity<>("Invalid credentials or account is pending approval.", HttpStatus.UNAUTHORIZED);
        }
    }
}