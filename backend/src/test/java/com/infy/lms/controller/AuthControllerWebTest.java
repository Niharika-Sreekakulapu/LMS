package com.infy.lms.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.infy.lms.dto.ForgotPasswordRequest;
import com.infy.lms.dto.UserSummaryDto;
import com.infy.lms.enums.Role;
import com.infy.lms.enums.UserStatus;
import com.infy.lms.model.User;
import com.infy.lms.repository.ApiTokenRepository;
import com.infy.lms.repository.UserRepository;
import com.infy.lms.service.AuthService;
import com.infy.lms.service.FileStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
class AuthControllerWebTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockBean private AuthService authService;
    @MockBean private FileStorageService fileStorageService;
    @MockBean private ApiTokenRepository apiTokenRepository;
    @MockBean private UserRepository userRepository;

    // Mock the AuthenticationManager bean directly — this prevents Spring from failing to create it.
    @MockBean private AuthenticationManager authenticationManager;

    private Authentication fakeAuthentication;



    @BeforeEach
    void setUp() {
        User user = User.builder()
                .id(1L)
                .name("Test User")
                .email("t@example.com")
                .password("noop")
                .role(com.infy.lms.enums.Role.STUDENT)
                .enabled(true)
                .firstLogin(true)
                .membershipType(User.MembershipType.NORMAL)
                .status(UserStatus.APPROVED) // use your enum literal
                .build();

        // make userRepository.findByEmail(...) return this user so controller doesn't early-404
        when(userRepository.findByEmail("t@example.com")).thenReturn(Optional.of(user));
        fakeAuthentication = mock(Authentication.class);
        // stub the authentication manager to return a successful Authentication
        when(authenticationManager.authenticate(any(Authentication.class))).thenReturn(fakeAuthentication);
    }

    @Test
    void login_success_returnsUserSummary() throws Exception {
        // build DTO the service will return (we already stubbed authService)
        UserSummaryDto dto = new UserSummaryDto(
                1L,
                "Test User",
                "t@example.com",
                "9876543210",
                Role.STUDENT,
                com.infy.lms.enums.UserStatus.APPROVED.name(),
                null,
                Instant.now(),
                null,
                null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 0, 0, 0.0, 0
        );

        // stub authService broadly
        when(authService.getUserSummaryByEmail(anyString())).thenReturn(dto);

        String payload = objectMapper.writeValueAsString(
                java.util.Map.of("email", "t@example.com", "password", "password123")
        );

        // perform once and capture response for robust assertions / debugging
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .characterEncoding("UTF-8")
                        .content(payload))
                .andReturn();

        int status = result.getResponse().getStatus();
        String respBody = result.getResponse().getContentAsString();

        // helpful debug if it isn't 200
        if (status != 200) {
            System.err.println("DEBUG /api/auth/login -> status=" + status + " body=" + respBody);
        }

        // now try to extract email from multiple likely locations
        com.fasterxml.jackson.databind.JsonNode root = objectMapper.readTree(respBody);

        String foundEmail = null;
        if (root.has("email")) {
            foundEmail = root.path("email").asText(null);
        } else if (root.has("user") && root.path("user").has("email")) {
            foundEmail = root.path("user").path("email").asText(null);
        } else if (root.has("userSummary") && root.path("userSummary").has("email")) {
            foundEmail = root.path("userSummary").path("email").asText(null);
        } else if (root.has("data") && root.path("data").has("user") && root.path("data").path("user").has("email")) {
            foundEmail = root.path("data").path("user").path("email").asText(null);
        } else if (root.has("user") && root.path("user").has("userSummary") &&
                root.path("user").path("userSummary").has("email")) {
            foundEmail = root.path("user").path("userSummary").path("email").asText(null);
        }

        // assert we got 200
        assertEquals(200, status, "Expected HTTP 200 OK from /api/auth/login; body: " + respBody);

        // assert email present and correct
        assertNotNull(foundEmail, "Response did not contain user email. Body: " + respBody);
        assertEquals("t@example.com", foundEmail);

        // also assert name and status if available (best-effort)
        if (root.has("name")) {
            assertEquals("Test User", root.path("name").asText());
        } else if (root.has("user") && root.path("user").has("name")) {
            assertEquals("Test User", root.path("user").path("name").asText());
        }

        if (root.has("status")) {
            assertEquals("APPROVED", root.path("status").asText());
        } else if (root.has("user") && root.path("user").has("status")) {
            assertEquals("APPROVED", root.path("user").path("status").asText());
        }

        // verify calls
        verify(authenticationManager, times(1)).authenticate(any(UsernamePasswordAuthenticationToken.class));
        verify(authService, times(1)).getUserSummaryByEmail(anyString());
    }

}
