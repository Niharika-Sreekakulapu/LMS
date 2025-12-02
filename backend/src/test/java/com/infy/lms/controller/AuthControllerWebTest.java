package com.infy.lms.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.infy.lms.dto.ForgotPasswordRequest;
import com.infy.lms.dto.UserSummaryDto;
import com.infy.lms.enums.Role;
import com.infy.lms.service.AuthService;
import com.infy.lms.service.FileStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false) // <-- disable Spring Security filters for this test slice
class AuthControllerWebTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @MockBean
    private FileStorageService fileStorageService;

    @MockBean
    private AuthenticationConfiguration authenticationConfiguration;

    private AuthenticationManager fakeAuthManager;
    private Authentication fakeAuthentication;

    @BeforeEach
    void setUp() throws Exception {
        MockitoAnnotations.openMocks(this);

        fakeAuthManager = mock(AuthenticationManager.class);
        fakeAuthentication = mock(Authentication.class);

        when(fakeAuthManager.authenticate(any(Authentication.class))).thenReturn(fakeAuthentication);
        when(authenticationConfiguration.getAuthenticationManager()).thenReturn(fakeAuthManager);
    }

    @Test
    void login_success_returnsUserSummary() throws Exception {
        UserSummaryDto dto = new UserSummaryDto(
                1L,
                "Test User",
                "t@example.com",
                "9876543210",
                Role.STUDENT,
                "APPROVED",
                null,
                Instant.now()
        );

        when(authService.getUserSummaryByEmail("t@example.com")).thenReturn(dto);

        String payload = objectMapper.writeValueAsString(
                java.util.Map.of("email", "t@example.com", "password", "password123")
        );

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("t@example.com"))
                .andExpect(jsonPath("$.name").value("Test User"))
                .andExpect(jsonPath("$.status").value("APPROVED"));

        verify(authenticationConfiguration, times(1)).getAuthenticationManager();
        verify(fakeAuthManager, times(1)).authenticate(any(UsernamePasswordAuthenticationToken.class));
        verify(authService, times(1)).getUserSummaryByEmail("t@example.com");
    }

    @Test
    void forgotPassword_callsService_andReturnsMessage() throws Exception {
        ForgotPasswordRequest req = new ForgotPasswordRequest();
        req.setEmail("forgot@example.com");

        String body = objectMapper.writeValueAsString(req);

        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").exists());

        verify(authService, times(1)).createPasswordResetToken(eq("forgot@example.com"));
    }
}
