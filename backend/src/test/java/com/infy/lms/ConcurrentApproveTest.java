package com.infy.lms;

import com.infy.lms.dto.BookRequestResponseDTO;
import com.infy.lms.model.RequestStatus;
import com.infy.lms.model.Book;
import com.infy.lms.model.BookRequest;
import com.infy.lms.model.User;
import com.infy.lms.repository.BookRepository;
import com.infy.lms.repository.BookRequestRepository;
import com.infy.lms.repository.BorrowRecordRepository;
import com.infy.lms.repository.UserRepository;
import com.infy.lms.service.BookRequestService;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.mail.javamail.JavaMailSender;

import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public class ConcurrentApproveTest {

    @Autowired
    private BookRepository bookRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BookRequestRepository requestRepository;

    @Autowired
    private BorrowRecordRepository borrowRecordRepository;

    @Autowired
    private BookRequestService bookRequestService;

    // Provide a mock JavaMailSender so EmailServiceImpl bean can be created during test context startup
    @MockBean
    private JavaMailSender javaMailSender;

    private Book testBook;
    private User student1;
    private User student2;
    private User librarian;

    private BookRequest req1;
    private BookRequest req2;

    @BeforeEach
    public void setup() {
        // clean DB tables (rudimentary)
        borrowRecordRepository.deleteAll();
        requestRepository.deleteAll();
        bookRepository.deleteAll();
        userRepository.deleteAll();

        // create a book with exactly 1 available copy
        Book book = Book.builder()
                .title("Concurrent Test Book")
                .author("Test")
                .totalCopies(1)
                .availableCopies(1)
                .issuedCopies(0)
                .build();
        testBook = bookRepository.saveAndFlush(book);

        // create two students
        User s1 = User.builder()
                .name("Student One")
                .email("student1@example.com")
                .password("noop")
                .role(com.infy.lms.enums.Role.STUDENT)
                .enabled(true)
                .firstLogin(true)
                .membershipType(User.MembershipType.NORMAL)
                .status(com.infy.lms.enums.UserStatus.APPROVED)
                .build();
        student1 = userRepository.saveAndFlush(s1);

        User s2 = User.builder()
                .name("Student Two")
                .email("student2@example.com")
                .password("noop")
                .role(com.infy.lms.enums.Role.STUDENT)
                .enabled(true)
                .firstLogin(true)
                .membershipType(User.MembershipType.NORMAL)
                .status(com.infy.lms.enums.UserStatus.APPROVED)
                .build();

        student2 = userRepository.saveAndFlush(s2);

        // create a librarian who will process requests
        User lib = User.builder()
                .name("Librarian")
                .email("lib@example.com")
                .password("noop")
                .role(com.infy.lms.enums.Role.LIBRARIAN)
                .enabled(true)
                .firstLogin(true)
                .membershipType(User.MembershipType.NORMAL)
                .status(com.infy.lms.enums.UserStatus.APPROVED)
                .build();


        librarian = userRepository.saveAndFlush(lib);

        // create two pending requests for same book by different students
        BookRequest br1 = new BookRequest();
        br1.setStudent(student1);
        br1.setBook(testBook);
        br1.setStatus(RequestStatus.PENDING);
        br1.setRequestedAt(java.time.Instant.now());
        req1 = requestRepository.saveAndFlush(br1);

        BookRequest br2 = new BookRequest();
        br2.setStudent(student2);
        br2.setBook(testBook);
        br2.setStatus(RequestStatus.PENDING);
        br2.setRequestedAt(java.time.Instant.now());
        req2 = requestRepository.saveAndFlush(br2);
    }

    @AfterAll
    public void tearDown() {
        // optional cleanup
        borrowRecordRepository.deleteAll();
        requestRepository.deleteAll();
        bookRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    public void testConcurrentApprovals_oneSucceeds_otherFails() throws Exception {
        final int THREADS = 2;
        ExecutorService ex = Executors.newFixedThreadPool(THREADS);

        // Latches to align thread start
        CountDownLatch ready = new CountDownLatch(THREADS);
        CountDownLatch start = new CountDownLatch(1);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);

        Callable<Void> task1 = () -> {
            ready.countDown();
            try {
                start.await();
                // call service - librarian processes request 1
                BookRequestResponseDTO dto = bookRequestService.approveRequest(req1.getId(), librarian.getId());
                assertNotNull(dto);
                assertEquals("APPROVED", dto.getStatus());
                successCount.incrementAndGet();
            } catch (Exception e) {
                failureCount.incrementAndGet();
            }
            return null;
        };

        Callable<Void> task2 = () -> {
            ready.countDown();
            try {
                start.await();
                // call service - librarian processes request 2
                BookRequestResponseDTO dto = bookRequestService.approveRequest(req2.getId(), librarian.getId());
                assertNotNull(dto);
                assertEquals("APPROVED", dto.getStatus());
                successCount.incrementAndGet();
            } catch (Exception e) {
                failureCount.incrementAndGet();
            }
            return null;
        };

        Future<Void> f1 = ex.submit(task1);
        Future<Void> f2 = ex.submit(task2);

        // Wait for threads to be ready, then start them together
        ready.await();
        start.countDown();

        // wait for completion
        try {
            f1.get();
        } catch (ExecutionException ignored) {}
        try {
            f2.get();
        } catch (ExecutionException ignored) {}

        // allow small time for DB flushes
        Thread.sleep(200);

        // Exactly one should have succeeded
        assertEquals(1, successCount.get(), "Exactly one approval should succeed");
        assertEquals(1, failureCount.get(), "Exactly one approval should fail");

        // verify DB state: availableCopies == 0, issuedCopies == 1
        Book finalBook = bookRepository.findById(testBook.getId()).orElseThrow();
        assertEquals(0, finalBook.getAvailableCopies().intValue(), "availableCopies should be 0");
        assertEquals(1, finalBook.getIssuedCopies().intValue(), "issuedCopies should be 1");

        // verify borrow record count is 1
        long borrowCount = borrowRecordRepository.findAll().stream()
                .filter(b -> b.getBook().getId().equals(testBook.getId()))
                .count();
        assertEquals(1, borrowCount, "Exactly one borrow record should exist for the book");

        ex.shutdownNow();
    }
}
