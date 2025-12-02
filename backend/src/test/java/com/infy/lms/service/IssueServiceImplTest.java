package com.infy.lms.service;

import com.infy.lms.dto.IssueRequest;
import com.infy.lms.dto.IssueResponse;
import com.infy.lms.exception.ConflictException;
import com.infy.lms.exception.NotFoundException;
import com.infy.lms.model.Book;
import com.infy.lms.model.Issue;
import com.infy.lms.model.User;
import com.infy.lms.repository.BookRepository;
import com.infy.lms.repository.IssueRepository;
import com.infy.lms.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.*;
import java.time.LocalDate;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;


class IssueServiceImplTest {

    @Mock BookRepository bookRepo;
    @Mock UserRepository userRepo;
    @Mock IssueRepository issueRepo;

    @InjectMocks
    com.infy.lms.service.IssueServiceImpl issueService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void issueBook_success() {
        Long bookId = 1L, userId = 2L;
        IssueRequest req = new IssueRequest();
        req.setBookId(bookId);
        req.setUserId(userId);

        User user = new User(); user.setId(userId);
        when(userRepo.findById(userId)).thenReturn(Optional.of(user));
        when(bookRepo.decrementAvailableCopiesIfAvailable(bookId)).thenReturn(1);

        Book book = new Book(); book.setId(bookId);
        when(bookRepo.findById(bookId)).thenReturn(Optional.of(book));
        when(issueRepo.save(any(Issue.class))).thenAnswer(inv -> {
            Issue i = (Issue) inv.getArgument(0);
            i.setId(100L);
            return i;
        });

        IssueResponse resp = issueService.issueBook(req);

        assertNotNull(resp);
        assertEquals(bookId, resp.getBookId());
        assertEquals(userId, resp.getUserId());
        assertEquals("ISSUED", resp.getStatus());
        verify(bookRepo, times(1)).decrementAvailableCopiesIfAvailable(bookId);
    }

    @Test
    void issueBook_noCopies_throwsConflict() {
        Long bookId = 1L, userId = 2L;
        IssueRequest req = new IssueRequest();
        req.setBookId(bookId);
        req.setUserId(userId);

        User user = new User(); user.setId(userId);
        when(userRepo.findById(userId)).thenReturn(Optional.of(user));
        when(bookRepo.decrementAvailableCopiesIfAvailable(bookId)).thenReturn(0);
        when(bookRepo.existsById(bookId)).thenReturn(true);

        ConflictException ex = assertThrows(ConflictException.class, () -> issueService.issueBook(req));
        assertTrue(ex.getMessage().contains("No available copies"));
    }

    @Test
    void issueBook_bookMissing_throwsNotFound() {
        Long bookId = 1L, userId = 2L;
        IssueRequest req = new IssueRequest();
        req.setBookId(bookId);
        req.setUserId(userId);

        User user = new User(); user.setId(userId);
        when(userRepo.findById(userId)).thenReturn(Optional.of(user));
        when(bookRepo.decrementAvailableCopiesIfAvailable(bookId)).thenReturn(0);
        when(bookRepo.existsById(bookId)).thenReturn(false);

        NotFoundException ex = assertThrows(NotFoundException.class, () -> issueService.issueBook(req));
        assertTrue(ex.getMessage().contains("Book not found"));
    }
}
