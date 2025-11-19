package com.infy.lms.controller;

import com.infy.lms.enums.UserStatus;
import com.infy.lms.model.User;
import com.infy.lms.repository.UserRepository;
import com.infy.lms.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin") // Base URL for all Admin operations
public class AdminController {

    private final UserRepository userRepository;
    private final AuthService authService;

    // Dependency Injection (Spring gives us these components)
    public AdminController(UserRepository userRepository, AuthService authService) {
        this.userRepository = userRepository;
        this.authService = authService;
    }

    // Endpoint 1: GET /api/admin/pending - Get all users awaiting approval
    // This uses the repository directly to find pending users
    @GetMapping("/pending")
    public List<User> getPendingUsers() {
        return userRepository.findAll().stream()
                .filter(user -> user.getStatus() == UserStatus.PENDING)
                .toList();
    }

    // Endpoint 2: PUT /api/admin/approve/{userId} - Approve a user
    // {userId} is a variable taken from the URL path
    @PutMapping("/approve/{userId}")
    public ResponseEntity<?> approveUser(@PathVariable Long userId) {
        try {
            User approvedUser = authService.approveUser(userId);
            approvedUser.setPassword(null); // Hide password before returning
            return new ResponseEntity<>(approvedUser, HttpStatus.OK);
        } catch (Exception e) {
            // Return 404 if the user was not found by the ID
            return new ResponseEntity<>(e.getMessage(), HttpStatus.NOT_FOUND);
        }
    }
}