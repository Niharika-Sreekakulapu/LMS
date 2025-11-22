package com.infy.lms.service;

import com.infy.lms.dto.LoginRequest;
import com.infy.lms.dto.RegistrationRequest;
import com.infy.lms.dto.UserSummaryDto;
import com.infy.lms.enums.UserStatus;
import com.infy.lms.exception.ConflictException;
import com.infy.lms.exception.InternalServerErrorException;
import com.infy.lms.exception.NotFoundException;
import com.infy.lms.exception.UnauthorizedException;
import com.infy.lms.model.User;
import com.infy.lms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * Register a new user.
     * - Throws ConflictException if email already exists
     * - Throws InternalServerErrorException on persistence errors
     */
    @Transactional
    public User register(RegistrationRequest req) {
        if (req == null) {
            throw new IllegalArgumentException("RegistrationRequest must be provided");
        }

        if (userRepository.existsByEmail(req.getEmail())) {
            throw new ConflictException("Email already in use");
        }

        User user = User.builder()
                .name(req.getName())
                .email(req.getEmail())
                .phone(req.getPhone())
                .role(req.getRole())
                .password(passwordEncoder.encode(req.getPassword()))
                .status(UserStatus.PENDING)
                .firstLogin(true)
                .build();

        try {
            return userRepository.save(user);
        } catch (Exception ex) {
            // log the exception using your logger in real code
            throw new InternalServerErrorException("Failed to register user");
        }
    }

    /**
     * Authenticate a user by email + password.
     * - Throws UnauthorizedException for invalid credentials or non-approved accounts
     *
     * Note: this method expects LoginRequest to include an "email" field.
     * If your frontend sends "username" instead, either change the frontend
     * to send email or update LoginRequest DTO to include username.
     */
    public User authenticate(LoginRequest req) {
        if (req == null || req.getEmail() == null || req.getPassword() == null) {
            throw new IllegalArgumentException("LoginRequest, email and password must be provided");
        }

        // Find by email (this matches your repository usage)
        User user = userRepository.findByEmail(req.getEmail())
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));

        if (user.getStatus() != UserStatus.APPROVED) {
            throw new UnauthorizedException("Account not approved by admin");
        }

        if (!passwordEncoder.matches(req.getPassword(), user.getPassword())) {
            throw new UnauthorizedException("Invalid email or password");
        }
        return user;
    }

    @Transactional
    public User approveUser(Long userId) {
        User u = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        u.setStatus(UserStatus.APPROVED);
        u.setFirstLogin(true);
        try {
            return userRepository.save(u);
        } catch (Exception ex) {
            throw new InternalServerErrorException("Failed to approve user");
        }
    }

    @Transactional
    public User rejectUser(Long userId, String reason) {
        User u = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        u.setStatus(UserStatus.REJECTED);
        // optionally store reason somewhere
        try {
            return userRepository.save(u);
        } catch (Exception ex) {
            throw new InternalServerErrorException("Failed to reject user");
        }
    }

    /**
     * Save ID proof path and mark user pending for admin re-approval.
     */
    @Transactional
    public void saveIdProof(Long userId, String storedPath) {
        User u = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        u.setIdProofPath(storedPath);
        u.setStatus(UserStatus.PENDING); // ensure admin re-approves after new upload
        try {
            userRepository.save(u);
        } catch (Exception ex) {
            throw new InternalServerErrorException("Failed to save ID proof");
        }
    }

    /**
     * Return list of users with PENDING status as DTOs.
     */
    @Transactional(readOnly = true)
    public List<UserSummaryDto> listPendingUsers() {
        return userRepository.findByStatus(UserStatus.PENDING)
                .stream()
                .map(u -> new UserSummaryDto(u.getId(), u.getEmail(), u.getName(), u.getRole(), u.getStatus()))
                .collect(Collectors.toList());
    }
}
