package com.infy.lms.service;

import com.infy.lms.dto.RegistrationRequest;
import com.infy.lms.dto.UserSummaryDto;
import com.infy.lms.enums.BorrowStatus;
import com.infy.lms.enums.UserStatus;
import com.infy.lms.exception.BadRequestException;
import com.infy.lms.exception.NotFoundException;
import com.infy.lms.exception.ResourceAlreadyExistsException;
import com.infy.lms.model.PasswordResetToken;
import com.infy.lms.model.User;
import com.infy.lms.repository.BorrowRecordRepository;
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
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final BorrowRecordRepository borrowRecordRepository;
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
                .map(u -> {
                    int completeness = calculateProfileCompleteness(u);
                    return new UserSummaryDto(
                            u.getId(),
                            u.getName(),
                            u.getEmail(),
                            u.getPhone(),
                            u.getRole(),
                            u.getStatus().name(),
                            u.getIdProofPath(),
                            u.getCreatedAt(),
                            u.getMembershipType() != null ? u.getMembershipType().name() : "NORMAL",
                            // Additional profile fields
                            u.getDateOfBirth(),
                            u.getAddress(),
                            u.getEmergencyContactName(),
                            u.getEmergencyContactPhone(),
                            u.getCourse(),
                            u.getYear(),
                            u.getStudentId(),
                            u.getInterests(),
                            u.getHobbies(),
                            u.getMonthlyReadingGoal(),
                            u.getEmailNotifications(),
                            u.getPointsBalance(),
                            u.getBadges(),
                            u.getReadingStreak(),
                            u.getFavoriteGenres(),
                            u.getTotalReadTime(),
                            u.getFavoriteBooksCount(),
                            u.getReviewsGiven(),
                            u.getProfilePicture(),
                            // Calculated fields (set to 0 for list view)
                            0, 0, 0.0, completeness
                    );
                })
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

        // Calculate profile completeness (count filled fields)
        int completeness = calculateProfileCompleteness(user);

        // Calculate borrow statistics
        var borrowStats = calculateBorrowStatistics(user.getId());
        int totalBorrows = borrowStats.getTotalBorrows();
        int activeBorrows = borrowStats.getActiveBorrows();
        double outstandingFines = borrowStats.getOutstandingFines();

        return new UserSummaryDto(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole(),
                user.getStatus().name(),
                user.getIdProofPath(),
                user.getCreatedAt(),
                user.getMembershipType() != null ? user.getMembershipType().name() : "NORMAL",
                // Additional profile fields
                user.getDateOfBirth(),
                user.getAddress(),
                user.getEmergencyContactName(),
                user.getEmergencyContactPhone(),
                user.getCourse(),
                user.getYear(),
                user.getStudentId(),
                user.getInterests(),
                user.getHobbies(),
                user.getMonthlyReadingGoal(),
                user.getEmailNotifications(),
                user.getPointsBalance(),
                user.getBadges(),
                user.getReadingStreak(),
                user.getFavoriteGenres(),
                user.getTotalReadTime(),
                user.getFavoriteBooksCount(),
                user.getReviewsGiven(),
                user.getProfilePicture(),
                // Calculated fields
                totalBorrows,
                activeBorrows,
                outstandingFines,
                completeness
        );
    }

    private int calculateProfileCompleteness(User user) {
        int completed = 0;
        int total = 10;

        // Basic fields
        if (user.getName() != null && !user.getName().trim().isEmpty()) completed++;
        if (user.getEmail() != null && !user.getEmail().trim().isEmpty()) completed++;
        if (user.getPhone() != null && !user.getPhone().trim().isEmpty()) completed++;
        if (user.getDateOfBirth() != null) completed++;
        if (user.getAddress() != null && !user.getAddress().trim().isEmpty()) completed++;

        // Emergency contact
        if (user.getEmergencyContactName() != null && !user.getEmergencyContactName().trim().isEmpty()) completed++;
        if (user.getEmergencyContactPhone() != null && !user.getEmergencyContactPhone().trim().isEmpty()) completed++;

        // Academic info
        if (user.getCourse() != null && !user.getCourse().trim().isEmpty()) completed++;
        if (user.getYear() != null && !user.getYear().trim().isEmpty()) completed++;
        if (user.getStudentId() != null && !user.getStudentId().trim().isEmpty()) completed++;

        // Interests/hobbies
        if ((user.getInterests() != null && !user.getInterests().trim().isEmpty()) ||
            (user.getHobbies() != null && !user.getHobbies().trim().isEmpty())) completed++;

        return Math.min(100, Math.round((completed * 100.0f) / total));
    }

    @Override
    public User getUserEntityByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }

    @Override
    @Transactional
    public User updateUserProfile(String email, Map<String, Object> updates) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        // Update fields from the map
        if (updates.containsKey("name") && updates.get("name") != null) {
            user.setName((String) updates.get("name"));
        }
        if (updates.containsKey("phone") && updates.get("phone") != null) {
            user.setPhone((String) updates.get("phone"));
        }
        if (updates.containsKey("dateOfBirth") && updates.get("dateOfBirth") != null) {
            // Assuming it's a string in YYYY-MM-DD format, convert to LocalDate
            try {
                user.setDateOfBirth(LocalDate.parse((String) updates.get("dateOfBirth")));
            } catch (Exception e) {
                // Handle parsing error, maybe set to null or log
            }
        }
        if (updates.containsKey("address") && updates.get("address") != null) {
            user.setAddress((String) updates.get("address"));
        }
        if (updates.containsKey("emergencyContactName") && updates.get("emergencyContactName") != null) {
            user.setEmergencyContactName((String) updates.get("emergencyContactName"));
        }
        if (updates.containsKey("emergencyContactPhone") && updates.get("emergencyContactPhone") != null) {
            user.setEmergencyContactPhone((String) updates.get("emergencyContactPhone"));
        }
        if (updates.containsKey("course") && updates.get("course") != null) {
            user.setCourse((String) updates.get("course"));
        }
        if (updates.containsKey("year") && updates.get("year") != null) {
            user.setYear((String) updates.get("year"));
        }
        if (updates.containsKey("studentId") && updates.get("studentId") != null) {
            user.setStudentId((String) updates.get("studentId"));
        }
        if (updates.containsKey("interests") && updates.get("interests") != null) {
            user.setInterests((String) updates.get("interests"));
        }
        if (updates.containsKey("hobbies") && updates.get("hobbies") != null) {
            user.setHobbies((String) updates.get("hobbies"));
        }
        if (updates.containsKey("monthlyReadingGoal") && updates.get("monthlyReadingGoal") != null) {
            user.setMonthlyReadingGoal((Integer) updates.get("monthlyReadingGoal"));
        }
        if (updates.containsKey("emailNotifications") && updates.get("emailNotifications") != null) {
            user.setEmailNotifications((Boolean) updates.get("emailNotifications"));
        }

        // Save and return updated user
        return userRepository.save(user);
    }

    private static class BorrowStats {
        private final int totalBorrows;
        private final int activeBorrows;
        private final double outstandingFines;

        public BorrowStats(int totalBorrows, int activeBorrows, double outstandingFines) {
            this.totalBorrows = totalBorrows;
            this.activeBorrows = activeBorrows;
            this.outstandingFines = outstandingFines;
        }

        public int getTotalBorrows() { return totalBorrows; }
        public int getActiveBorrows() { return activeBorrows; }
        public double getOutstandingFines() { return outstandingFines; }
    }

    private BorrowStats calculateBorrowStatistics(Long userId) {
        var borrowRecords = borrowRecordRepository.findByStudentId(userId);

        int totalBorrows = borrowRecords.size();

        int activeBorrows = (int) borrowRecords.stream()
                .filter(br -> br.getReturnedAt() == null)
                .count();

        double outstandingFines = borrowRecords.stream()
                .filter(br -> br.getPenaltyStatus() == com.infy.lms.model.BorrowRecord.PenaltyStatus.PENDING)
                .mapToDouble(br -> br.getPenaltyAmount().doubleValue())
                .sum();

        return new BorrowStats(totalBorrows, activeBorrows, outstandingFines);
    }

}
