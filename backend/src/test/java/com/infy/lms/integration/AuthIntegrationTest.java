package com.infy.lms.integration;

import com.infy.lms.dto.RegistrationRequest;
import com.infy.lms.enums.Role;
import com.infy.lms.enums.UserStatus;
import com.infy.lms.model.User;
import com.infy.lms.repository.UserRepository;
import com.infy.lms.service.AuthService;
import com.infy.lms.service.EmailService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class AuthIntegrationTest {

    @Autowired
    private AuthService authService;

    @Autowired
    private UserRepository userRepository;

    // mock email sending so tests don't try to actually send mail
    @MockBean
    private EmailService emailService;

    @Test
    @Transactional
    void register_then_approve_flow_works() {
        // --- prepare registration DTO ---
        RegistrationRequest req = new RegistrationRequest();
        req.setName("Integration Tester");
        req.setEmail("int-tester@example.com");
        req.setPhone("9876543210");
        req.setPassword("strongPass123");
        req.setRole(Role.STUDENT);

        // --- call real service to register (uses real repositories + password encoder) ---
        authService.registerUser(req, null);

        // --- assert user was persisted and is PENDING ---
        Optional<User> maybe = userRepository.findByEmail("int-tester@example.com");
        assertThat(maybe).isPresent();
        User u = maybe.get();
        assertThat(u.getStatus()).isEqualTo(UserStatus.PENDING);
        assertThat(u.getFirstLogin()).isTrue();
        assertThat(u.isEnabled()).isFalse();

        // verify emailService wasn't incorrectly invoked for registration path (optional)
        verify(emailService, never()).sendEmail(anyString(), anyString(), anyString());

        // --- approve user via service (this will set enabled true and status APPROVED) ---
        User approved = authService.approveUser(u.getId());

        assertThat(approved).isNotNull();
        assertThat(approved.getStatus()).isEqualTo(UserStatus.APPROVED);
        assertThat(approved.isEnabled()).isTrue();

        // verify that approval triggered an email send (one of the overloaded methods)
        verify(emailService, atLeastOnce()).sendEmail(eq(u.getEmail()), contains("Account Approved"), anyString());
    }
}
