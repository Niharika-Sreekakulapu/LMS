package com.infy.lms.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.infy.lms.dto.UserSummaryDto;
import com.infy.lms.model.User;
import com.infy.lms.service.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdminController.class)
@AutoConfigureMockMvc(addFilters = false)
class AdminControllerWebTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @Test
    void approve_returnsMessageAndStatus() throws Exception {
        User u = new User();
        u.setId(5L);
        u.setStatus(null); // will be set by service
        u.setName("ApproveMe");

        User returned = new User();
        returned.setId(5L);
        returned.setStatus(com.infy.lms.enums.UserStatus.APPROVED);

        when(authService.approveUser(5L)).thenReturn(returned);

        mockMvc.perform(post("/api/admin/approve/5")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("User approved"))
                .andExpect(jsonPath("$.id").value(5))
                .andExpect(jsonPath("$.status").value("APPROVED"));

        verify(authService, times(1)).approveUser(5L);
    }

    @Test
    void reject_returnsMessageAndStatus() throws Exception {
        User returned = new User();
        returned.setId(6L);
        returned.setStatus(com.infy.lms.enums.UserStatus.REJECTED);

        when(authService.rejectUser(eq(6L), any())).thenReturn(returned);

        mockMvc.perform(post("/api/admin/reject/6")
                        .param("reason", "bad id")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("User rejected"))
                .andExpect(jsonPath("$.id").value(6))
                .andExpect(jsonPath("$.status").value("REJECTED"));

        verify(authService, times(1)).rejectUser(6L, "bad id");
    }

    @Test
    void listUsers_withoutStatus_returnsAll() throws Exception {
        UserSummaryDto a = new UserSummaryDto(1L, "A", "a@x.com", "123", com.infy.lms.enums.Role.STUDENT, "PENDING", null, Instant.now());
        UserSummaryDto b = new UserSummaryDto(2L, "B", "b@x.com", "456", com.infy.lms.enums.Role.LIBRARIAN, "APPROVED", null, Instant.now());

        when(authService.listAllUsers()).thenReturn(List.of(a, b));

        mockMvc.perform(get("/api/admin/users")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].email").value("a@x.com"))
                .andExpect(jsonPath("$[1].email").value("b@x.com"));

        verify(authService, times(1)).listAllUsers();
    }

    @Test
    void listUsers_withStatus_filtersCorrectly() throws Exception {
        UserSummaryDto a = new UserSummaryDto(1L, "A", "a@x.com", "123", com.infy.lms.enums.Role.STUDENT, "PENDING", null, Instant.now());
        UserSummaryDto b = new UserSummaryDto(2L, "B", "b@x.com", "456", com.infy.lms.enums.Role.LIBRARIAN, "APPROVED", null, Instant.now());

        when(authService.listAllUsers()).thenReturn(List.of(a, b));

        mockMvc.perform(get("/api/admin/users")
                        .param("status", "approved")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].email").value("b@x.com"));

        verify(authService, times(1)).listAllUsers();
    }
}
