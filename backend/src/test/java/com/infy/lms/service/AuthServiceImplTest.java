package com.infy.lms.service;

import com.infy.lms.dto.RegistrationRequest;
import com.infy.lms.dto.UserSummaryDto;
import com.infy.lms.enums.Role;
import com.infy.lms.enums.UserStatus;
import com.infy.lms.exception.BadRequestException;
import com.infy.lms.exception.NotFoundException;
import com.infy.lms.exception.ResourceAlreadyExistsException;
import com.infy.lms.model.PasswordResetToken;
import com.infy.lms.model.User;
import com.infy.lms.repository.PasswordResetTokenRepository;
import com.infy.lms.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceImplTest {

    @InjectMocks
    private AuthServiceImpl authService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordResetTokenRepository tokenRepository;

    @Mock
    private EmailService emailService;

    @Mock
    private BCryptPasswordEncoder passwordEncoder;

    @Mock
    private com.infy.lms.repository.BorrowRecordRepository borrowRecordRepository;

    // sample default values
    private RegistrationRequest registrationRequest;

    @BeforeEach
    void setUp() {
        registrationRequest = new RegistrationRequest();
        registrationRequest.setName("Test User");
        registrationRequest.setEmail("test@example.com");
        registrationRequest.setPhone("9876543210");
        registrationRequest.setPassword("password123");
        registrationRequest.setRole(Role.STUDENT);
    }

    @Test
    void registerUser_whenEmailExists_throws() {
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(new User()));

        assertThatThrownBy(() -> authService.registerUser(registrationRequest, null))
                .isInstanceOf(ResourceAlreadyExistsException.class);

        verify(userRepository, never()).save(any());
    }

    @Test
    void registerUser_success_persistsUser() {
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("password123")).thenReturn("hashed-pass");

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        when(userRepository.save(captor.capture())).thenAnswer(i -> i.getArgument(0));

        authService.registerUser(registrationRequest, "/tmp/idproof.png");

        User saved = captor.getValue();
        assertThat(saved.getEmail()).isEqualTo("test@example.com");
        assertThat(saved.getName()).isEqualTo("Test User");
        assertThat(saved.getStatus()).isEqualTo(UserStatus.PENDING);
        assertThat(saved.getPassword()).isEqualTo("hashed-pass");
        assertThat(saved.getIdProofPath()).isEqualTo("/tmp/idproof.png");
        verify(userRepository, times(1)).save(any());
    }

    @Test
    void createPasswordResetToken_noUser_doesNothing() {
        when(userRepository.findByEmail("missing@example.com")).thenReturn(Optional.empty());

        // should not throw, should not call tokenRepository or emailService
        authService.createPasswordResetToken("missing@example.com");

        verify(tokenRepository, never()).save(any());
        verify(emailService, never()).sendEmail(any(), any(), any());
    }

    @Test
    void createPasswordResetToken_withUser_sendsEmailAndSavesToken() {
        User user = new User();
        user.setId(42L);
        user.setName("Alice");
        user.setEmail("alice@example.com");

        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));
        ArgumentCaptor<PasswordResetToken> tokenCaptor = ArgumentCaptor.forClass(PasswordResetToken.class);

        authService.createPasswordResetToken("alice@example.com");

        verify(tokenRepository, times(1)).save(tokenCaptor.capture());
        PasswordResetToken savedToken = tokenCaptor.getValue();
        assertThat(savedToken.getToken()).isNotBlank();
        assertThat(savedToken.getUser()).isEqualTo(user);
        assertThat(savedToken.getExpiresAt()).isAfter(Instant.now());

        verify(emailService, times(1)).sendEmail(eq("alice@example.com"), anyString(), contains(savedToken.getToken()));
    }

    @Test
    void resetPassword_tokenNotFound_throwsNotFound() {
        when(tokenRepository.findByToken("badtoken")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.resetPassword("badtoken", "newpass"))
                .isInstanceOf(NotFoundException.class);

        verify(passwordEncoder, never()).encode(any());
    }

    @Test
    void resetPassword_tokenExpired_throwsBadRequest() {
        User user = new User();
        user.setEmail("u@example.com");
        PasswordResetToken expired = new PasswordResetToken();
        expired.setToken("t");
        expired.setUser(user);
        expired.setExpiresAt(Instant.now().minus(1, ChronoUnit.HOURS));

        when(tokenRepository.findByToken("t")).thenReturn(Optional.of(expired));

        assertThatThrownBy(() -> authService.resetPassword("t", "newpass"))
                .isInstanceOf(BadRequestException.class);

        verify(tokenRepository, times(1)).delete(expired);
        verify(passwordEncoder, never()).encode(any());
    }

    @Test
    void resetPassword_success_updatesPasswordAndDeletesToken() {
        User user = new User();
        user.setEmail("user@example.com");
        user.setName("User");
        PasswordResetToken prt = new PasswordResetToken();
        prt.setToken("goodtoken");
        prt.setUser(user);
        prt.setExpiresAt(Instant.now().plus(1, ChronoUnit.HOURS));

        when(tokenRepository.findByToken("goodtoken")).thenReturn(Optional.of(prt));
        when(passwordEncoder.encode("newPass!")).thenReturn("encodedNew");

        authService.resetPassword("goodtoken", "newPass!");

        // verify password was changed and user saved
        verify(tokenRepository, times(1)).delete(prt);
        // We expect userRepository.save called once with user having encoded password
        verify(userRepository, times(1)).save(argThat(u -> "encodedNew".equals(u.getPassword())));
        verify(emailService, times(1)).sendEmail(eq("user@example.com"), anyString(), contains("successfully updated"));
    }

    @Test
    void approveUser_success_approvesAndSendsEmail() {
        User user = new User();
        user.setId(11L);
        user.setName("Pending");
        user.setEmail("p@example.com");
        user.setStatus(UserStatus.PENDING);
        user.setIdProofPath(null);

        when(userRepository.findById(11L)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        User result = authService.approveUser(11L);

        assertThat(result.getStatus()).isEqualTo(UserStatus.APPROVED);
        assertThat(result.isEnabled()).isTrue();
        verify(userRepository, times(1)).save(any());
        verify(emailService, times(1)).sendEmail(eq("p@example.com"), contains("Account Approved"), anyString());
    }

    @Test
    void approveUser_nonPending_throws() {
        User user = new User();
        user.setId(12L);
        user.setStatus(UserStatus.APPROVED);

        when(userRepository.findById(12L)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.approveUser(12L))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void rejectUser_success_rejectsAndSendsEmail() {
        User user = new User();
        user.setId(21L);
        user.setName("Candidate");
        user.setEmail("c@example.com");
        user.setStatus(UserStatus.PENDING);
        user.setIdProofPath(null);

        when(userRepository.findById(21L)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        User res = authService.rejectUser(21L, "Invalid ID");

        assertThat(res.getStatus()).isEqualTo(UserStatus.REJECTED);
        verify(userRepository, times(1)).save(any());
        verify(emailService, times(1)).sendEmail(eq("c@example.com"), contains("Account Rejected"), anyString());
    }

    @Test
    void getUserSummaryByEmail_notFound_throws() {
        when(userRepository.findByEmail("nope@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.getUserSummaryByEmail("nope@example.com"))
                .isInstanceOf(UsernameNotFoundException.class);
    }

    @Test
    void getUserSummaryByEmail_returnsDto() {
        User user = new User();
        user.setId(99L);
        user.setName("S");
        user.setEmail("s@example.com");
        user.setPhone("9999999999");
        user.setRole(Role.STUDENT);
        user.setStatus(UserStatus.APPROVED);
        when(userRepository.findByEmail("s@example.com")).thenReturn(Optional.of(user));

        UserSummaryDto dto = authService.getUserSummaryByEmail("s@example.com");

        assertThat(dto).isNotNull();
        assertThat(dto.getEmail()).isEqualTo("s@example.com");
        assertThat(dto.getStatus()).isEqualTo(UserStatus.APPROVED.name());
    }
}
