package com.infy.lms;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.infy.lms.enums.Role;
import com.infy.lms.enums.UserStatus;
import com.infy.lms.model.Book;
import com.infy.lms.model.User;
import com.infy.lms.repository.BookRepository;
import com.infy.lms.repository.BorrowRecordRepository;
import com.infy.lms.repository.UserRepository;
import com.infy.lms.service.SecurityService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase.Replace;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean; // okay for now
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes = com.infy.lms.LmsApplication.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@AutoConfigureTestDatabase(replace = Replace.ANY)
@ActiveProfiles("test")
public class RequestApproveIssueFlowTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper om;

    @Autowired BookRepository bookRepo;
    @Autowired UserRepository userRepo;
    @Autowired BorrowRecordRepository borrowRepo;

    @MockBean SecurityService securityService; // stub current user id
    @MockBean JavaMailSender javaMailSender;   // mock mail sender so EmailServiceImpl can be created
    @MockBean com.infy.lms.service.EmailService emailService; // mock high-level email service

    private User student;
    private User librarian;
    private Book book;

    @BeforeEach
    void setUp() {
        borrowRepo.deleteAll();
        bookRepo.deleteAll();
        userRepo.deleteAll();
        Mockito.reset(securityService, emailService);

        // --- STUDENT ---
        student = new User();
        student.setEmail("test-student@example.com");
        student.setEnabled(true);
        student.setPassword("noop"); // not used here
        student.setRole(Role.STUDENT);
        student.setName("Test Student");        // <-- required (NOT NULL in schema)
        student.setStatus(UserStatus.valueOf("APPROVED"));          // optional but safe
        student = userRepo.save(student);

        // --- LIBRARIAN ---
        librarian = new User();
        librarian.setEmail("test-librarian@example.com");
        librarian.setEnabled(true);
        librarian.setPassword("noop");
        librarian.setRole(Role.LIBRARIAN);
        librarian.setName("Test Librarian");    // <-- required
        librarian.setStatus(UserStatus.valueOf("APPROVED"));
        librarian = userRepo.save(librarian);

        // --- BOOK ---
        book = new Book();
        book.setTitle("Integration Test Book");
        book.setAuthor("Test Author");
        book.setTotalCopies(3);
        book.setAvailableCopies(3);
        book.setIssuedCopies(0);
        book = bookRepo.save(book);
    }

    @Test
    void fullRequestApproveIssueFlow_createsBorrowRecord_and_updatesInventory() throws Exception {
        // Student creates request
        Mockito.when(securityService.getCurrentUserId()).thenReturn(student.getId());
        Map<String,Object> requestBody = Map.of(
                "bookId", book.getId(),
                "requestedDays", 14,
                "notes", "Needed for testing"
        );

        String createResp = mvc.perform(post("/api/issue-requests")
                        .with(SecurityMockMvcRequestPostProcessors.user("student").roles("STUDENT"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(requestBody)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status", is("PENDING")))
                .andReturn()
                .getResponse().getContentAsString();

        JsonNode createdJson = om.readTree(createResp);
        Long requestId = createdJson.get("id").asLong();

        // Librarian approves
        Mockito.when(securityService.getCurrentUserId()).thenReturn(librarian.getId());

        String approveResp = mvc.perform(patch("/api/issue-requests/" + requestId + "/approve")
                        .with(SecurityMockMvcRequestPostProcessors.user("librarian").roles("LIBRARIAN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode approvedJson = om.readTree(approveResp);
        assertThat(approvedJson.get("processedById").asLong()).isEqualTo(librarian.getId());

        // History contains a borrow record
        mvc.perform(get("/api/members/" + student.getId() + "/history")
                        .with(SecurityMockMvcRequestPostProcessors.user("librarian").roles("LIBRARIAN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", not(empty())))
                .andExpect(jsonPath("$[0].bookTitle", containsString("Integration Test Book")));

        // Book inventory check — robust: compute expected issued = total - available
        String bookResp = mvc.perform(get("/api/books/" + book.getId())
                        .with(SecurityMockMvcRequestPostProcessors.user("librarian").roles("LIBRARIAN")))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode bookJson = om.readTree(bookResp);
        int totalCopies = bookJson.has("totalCopies") ? bookJson.get("totalCopies").asInt() : book.getTotalCopies();
        int availableCopies = bookJson.has("availableCopies") ? bookJson.get("availableCopies").asInt() : book.getAvailableCopies();
        int issuedCopies = bookJson.has("issuedCopies") ? bookJson.get("issuedCopies").asInt() : 0;

        int expectedIssued = Math.max(0, totalCopies - availableCopies);

        // Assert available decreased (optional)
        assertThat(availableCopies).isEqualTo(book.getTotalCopies() - 1);

        // Assert issuedCopies is consistent with total - available
        assertThat(issuedCopies).isEqualTo(expectedIssued);

    }
}
