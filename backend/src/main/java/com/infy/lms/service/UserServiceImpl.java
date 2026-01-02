package com.infy.lms.service;

import com.infy.lms.model.User;
import com.infy.lms.model.VerificationToken;
import com.infy.lms.repository.UserRepository;
import com.infy.lms.repository.VerificationTokenRepository;
import com.infy.lms.enums.UserStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final VerificationTokenRepository tokenRepo;
    private final EmailService emailService;

    /**
     * Base URL for verification endpoint, configurable in application.properties/yaml.
     * Example: app.backend.verify-url=http://localhost:8081/api/auth/verify
     */
    @Value("${app.backend.verify-url:http://localhost:8081/api/auth/verify}")
    private String verifyBaseUrl;

    @Override
    public User register(User user) {
        user.setStatus(UserStatus.PENDING);
        user.setFirstLogin(true);
        return userRepository.save(user);
    }

    @Override
    public void sendVerificationEmail(User user) {
        String token = UUID.randomUUID().toString();

        VerificationToken vToken = new VerificationToken();
        vToken.setToken(token);
        vToken.setUser(user);
        vToken.setExpiryDate(LocalDateTime.now().plusHours(24));

        tokenRepo.save(vToken);

        String url = buildVerificationUrl(token);

        String body = "<p>Hi " + user.getName() + ",</p>"
                + "<p>Thanks for registering. Click the link below to verify your account (valid 24 hours):</p>"
                + "<p><a href=\"" + url + "\">" + url + "</a></p>"
                + "<p>If you did not register, ignore this email.</p>";

        emailService.sendEmail(user.getEmail(), "Verify your LMS account", body);
    }

    private String buildVerificationUrl(String token) {
        String base = (verifyBaseUrl == null || verifyBaseUrl.isBlank()) ? "http://localhost:8081/api/auth/verify" : verifyBaseUrl;
        if (base.contains("?")) {
            return base + "&token=" + token;
        }
        return base + "?token=" + token;
    }
}
