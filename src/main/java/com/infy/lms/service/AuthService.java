package com.infy.lms.service;

import com.infy.lms.enums.Role;
import com.infy.lms.enums.UserStatus;
import com.infy.lms.model.User;
import com.infy.lms.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    // Injecting the Repository (for DB access) and PasswordEncoder (for hashing)
    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Finds a user by ID and changes their status to APPROVED.
     * Throws an exception if the user is not found.
     */
    public User approveUser(Long userId) throws Exception {
        return userRepository.findById(userId)
                .map(user -> {
                    if (user.getStatus() != UserStatus.APPROVED) {
                        user.setStatus(UserStatus.APPROVED);
                        return userRepository.save(user);
                    }
                    return user; // Already approved
                })
                .orElseThrow(() -> new Exception("User not found."));
    }

    /**
     * Handles the registration logic for Librarians and Students.
     */
    public User registerUser(User registrationDetails) throws Exception {
        // 1. Check if the email already exists (Username uniqueness check)
        if (userRepository.findByEmail(registrationDetails.getEmail()).isPresent()) {
            throw new Exception("Email already registered."); // Throwing an exception handled by controller
        }

        // 2. Hash the password before saving it to the database
        String hashedPassword = passwordEncoder.encode(registrationDetails.getPassword());
        registrationDetails.setPassword(hashedPassword);

        // 3. Set default values for new users
        // new Librarians/Students must be PENDING.
        registrationDetails.setStatus(UserStatus.PENDING);
        registrationDetails.setFirstLogin(true); // Forces password reset (best practice)

        // 4. Set the role based on what the frontend passed (LIBRARIAN or STUDENT)
        // Ensure the role is valid before proceeding
        if (registrationDetails.getRole() != Role.LIBRARIAN && registrationDetails.getRole() != Role.STUDENT) {
            throw new Exception("Invalid role specified for registration.");
        }

        // 5. Save the new user to the database
        return userRepository.save(registrationDetails);
    }

    /**
     * Handles the login logic.
     */
    public Optional<User> loginUser(String email, String rawPassword) {
        Optional<User> userOptional = userRepository.findByEmail(email);

        if (userOptional.isPresent()) {
            User user = userOptional.get();

            // Check 1: Verify the password hash matches the raw password input
            if (passwordEncoder.matches(rawPassword, user.getPassword())) {

                // Check 2: Verify the user status
                if (user.getStatus() == UserStatus.APPROVED || user.getRole() == Role.ADMIN) {
                    return Optional.of(user); // Login successful
                } else {
                    // Login fails if status is PENDING or REJECTED
                    // The Controller will return an appropriate message
                    return Optional.empty();
                }
            }
        }
        // Return empty if user not found or password doesn't match
        return Optional.empty();
    }
}