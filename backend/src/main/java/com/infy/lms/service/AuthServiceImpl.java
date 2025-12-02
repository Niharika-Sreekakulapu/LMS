package com.infy.lms.service;

import com.infy.lms.dto.RegistrationRequest;
import com.infy.lms.dto.UserSummaryDto;
import com.infy.lms.enums.UserStatus;
import com.infy.lms.exception.BadRequestException;
import com.infy.lms.exception.NotFoundException;
import com.infy.lms.exception.ResourceAlreadyExistsException;
import com.infy.lms.model.PasswordResetToken;
import com.infy.lms.model.User;
import com.infy.lms.repository.PasswordResetTokenRepository;
import com.infy.lms.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final EmailService emailService;
    private final BCryptPasswordEncoder passwordEncoder;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendBaseUrl;

    private static final SecureRandom secureRandom = new SecureRandom();

    // ------------------ Registration ------------------

    @Override
    @Transactional
    public void registerUser(RegistrationRequest request, String idProofPath) {

        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new ResourceAlreadyExistsException("Email already registered");
        }

        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setRole(request.getRole());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setStatus(UserStatus.PENDING);
        user.setFirstLogin(true);
        user.setEnabled(false);
        user.setIdProofPath(idProofPath);

        userRepository.save(user);
    }

    // ------------------ Password Reset Feature ------------------

    /**
     * Generate token and send reset email (valid for 1 hour)
     */
    @Override
    @Transactional
    public void createPasswordResetToken(String email) {

        Optional<User> opt = userRepository.findByEmail(email);

        // Do not reveal whether user exists
        if (opt.isEmpty()) return;

        User user = opt.get();

        // Generate secure random token
        byte[] random = new byte[32];
        secureRandom.nextBytes(random);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(random);

        PasswordResetToken prt = new PasswordResetToken();
        prt.setToken(token);
        prt.setUser(user);
        prt.setExpiresAt(Instant.now().plus(1, ChronoUnit.HOURS));

        tokenRepository.save(prt);

        // Build reset link using service-level config (defensive: handle null/blank)
        String base = (frontendBaseUrl == null || frontendBaseUrl.isBlank())
                ? "http://localhost:5173"
                : frontendBaseUrl;

        String resetLink;
        if (base.endsWith("/")) {
            resetLink = base + "reset-password";
        } else {
            resetLink = base + "/reset-password";
        }
        resetLink = resetLink + "?token=" + token;

        String body = "<p>Hi " + user.getName() + ",</p>"
                + "<p>You requested a password reset.</p>"
                + "<p>Click the link below to reset your password (valid for 1 hour):</p>"
                + "<p><a href='" + resetLink + "'>" + resetLink + "</a></p>"
                + "<p>If you didn't request this, ignore this email.</p>";

        emailService.sendEmail(user.getEmail(), "Password Reset - LMS", body);
    }

    /**
     * Reset password using token
     */
    @Override
    @Transactional
    public void resetPassword(String token, String newPassword) {

        PasswordResetToken prt = tokenRepository.findByToken(token)
                .orElseThrow(() -> new NotFoundException("Invalid or expired token"));

        if (prt.getExpiresAt().isBefore(Instant.now())) {
            tokenRepository.delete(prt);
            throw new BadRequestException("Token expired");
        }

        User user = prt.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Token becomes single-use
        tokenRepository.delete(prt);

        String body = "<p>Hi " + user.getName() + ",</p>"
                + "<p>Your password was successfully updated.</p>"
                + "<p>If you didn't do this, contact support immediately.</p>";

        emailService.sendEmail(user.getEmail(), "LMS Password Updated", body);
    }

    // ------------------ Admin Actions ------------------

    @Override
    @Transactional
    public User approveUser(Long id) {
        Optional<User> opt = userRepository.findById(id);
        if (opt.isEmpty()) {
            throw new BadRequestException("User not found with id: " + id);
        }
        User user = opt.get();
        if (user.getStatus() != UserStatus.PENDING) {
            throw new BadRequestException("Only PENDING users can be approved");
        }
        user.setStatus(UserStatus.APPROVED);
        user.setEnabled(true);
        User saved = userRepository.save(user);

        String body = "<p>Hi " + saved.getName() + ",</p>"
                + "<p>Your LMS account has been approved.</p>";

        if (saved.getIdProofPath() != null && !saved.getIdProofPath().isBlank()) {
            emailService.sendEmailWithAttachment(saved.getEmail(),
                    "LMS: Account Approved", body, saved.getIdProofPath());
        } else {
            emailService.sendEmail(saved.getEmail(), "LMS: Account Approved", body);
        }

        return saved;
    }

    @Override
    @Transactional
    public User rejectUser(Long id, String reason) {
        Optional<User> opt = userRepository.findById(id);
        if (opt.isEmpty()) {
            throw new BadRequestException("User not found with id: " + id);
        }
        User user = opt.get();
        if (user.getStatus() != UserStatus.PENDING) {
            throw new BadRequestException("Only PENDING users can be rejected");
        }
        user.setStatus(UserStatus.REJECTED);
        User saved = userRepository.save(user);

        String body = "<p>Hi " + saved.getName() + ",</p>"
                + "<p>Your LMS registration has been <strong>rejected</strong>.</p>"
                + "<p>Reason: " + escapeHtml(reason) + "</p>";

        if (saved.getIdProofPath() != null && !saved.getIdProofPath().isBlank()) {
            emailService.sendEmailWithAttachment(saved.getEmail(),
                    "LMS: Account Rejected", body, saved.getIdProofPath());
        } else {
            emailService.sendEmail(saved.getEmail(), "LMS: Account Rejected", body);
        }

        return saved;
    }

    // ------------------ List ALL USERS (Pending + Approved + Rejected) ------------------

    @Override
    public List<UserSummaryDto> listAllUsers() {
        List<User> all = userRepository.findAll();

        return all.stream()
                .map(u -> new UserSummaryDto(
                        u.getId(),
                        u.getName(),
                        u.getEmail(),
                        u.getPhone(),
                        u.getRole(),
                        u.getStatus().name(),      // ADDED
                        u.getIdProofPath(),        // ADDED
                        u.getCreatedAt()
                ))
                .collect(Collectors.toList());
    }


    private String escapeHtml(String input) {
        if (input == null) return null;
        return input.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }

    @Override
    public UserSummaryDto getUserSummaryByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        return new UserSummaryDto(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole(),
                user.getStatus().name(),
                user.getIdProofPath(),
                user.getCreatedAt()
        );
    }

    @Override
    public User getUserEntityByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }

}
