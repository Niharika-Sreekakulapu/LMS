package com.infy.lms.controller;

import com.infy.lms.dto.BookReservationDto;
import com.infy.lms.dto.BookWaitlistDto;
import com.infy.lms.model.Book;
import com.infy.lms.model.User;
import com.infy.lms.repository.BookRepository;
import com.infy.lms.repository.UserRepository;
import com.infy.lms.service.SecurityService;
import com.infy.lms.service.WaitlistService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/waitlist")
@RequiredArgsConstructor
public class WaitlistController {

    private final WaitlistService waitlistService;
    private final SecurityService securityService;
    private final UserRepository userRepository;
    private final BookRepository bookRepository;

    /**
     * Join waitlist for an unavailable book (Student)
     */
    @PostMapping("/join/{bookId}")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> joinWaitlist(@PathVariable Long bookId) {
        try {
            Long userId = securityService.getCurrentUserId();
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            User student = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
            Book book = bookRepository.findById(bookId).orElseThrow(() -> new RuntimeException("Book not found"));

            // Check if book is available
            if (book.getAvailableCopies() > 0) {
                return ResponseEntity.badRequest()
                    .body(Map.of("message", "Book is currently available - no need to join waitlist"));
            }

            BookWaitlistDto result = waitlistService.joinWaitlist(student, book);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            if (e.getMessage().contains("already in the waitlist")) {
                return ResponseEntity.badRequest()
                    .body(Map.of("message", "You are already in the waitlist for this book"));
            }
            throw e; // Re-throw other exceptions
        }
    }

    /**
     * Leave waitlist for a book (Student)
     */
    @DeleteMapping("/leave/{bookId}")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Void> leaveWaitlist(@PathVariable Long bookId) {
        Long userId = securityService.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        User student = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        Book book = bookRepository.findById(bookId).orElseThrow(() -> new RuntimeException("Book not found"));

        waitlistService.leaveWaitlist(student, book);
        return ResponseEntity.ok().build();
    }

    /**
     * Get student's current waitlist positions (Student)
     */
    @GetMapping("/my-waitlist")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<List<BookWaitlistDto>> getMyWaitlist() {
        Long userId = securityService.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        User student = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        List<BookWaitlistDto> waitlist = waitlistService.getStudentWaitlist(student);
        return ResponseEntity.ok(waitlist);
    }

    /**
     * Get waitlist position for a specific book (Student)
     */
    @GetMapping("/position/{bookId}")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<BookWaitlistDto> getWaitlistPosition(@PathVariable Long bookId) {
        Long userId = securityService.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        User student = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        Book book = bookRepository.findById(bookId).orElseThrow(() -> new RuntimeException("Book not found"));

        BookWaitlistDto position = waitlistService.getWaitlistPosition(student, book);
        if (position == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(position);
    }

    /**
     * Get waitlist for a book (Admin/Librarian)
     */
    @GetMapping("/book/{bookId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'LIBRARIAN')")
    public ResponseEntity<List<BookWaitlistDto>> getBookWaitlist(@PathVariable Long bookId) {
        Book book = bookRepository.findById(bookId).orElseThrow(() -> new RuntimeException("Book not found"));
        List<BookWaitlistDto> waitlist = waitlistService.getBookWaitlist(book);
        return ResponseEntity.ok(waitlist);
    }

    /**
     * Get all active waitlists grouped by book (Admin/Librarian)
     */
    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('ADMIN', 'LIBRARIAN')")
    public ResponseEntity<Map<Long, List<BookWaitlistDto>>> getAllActiveWaitlists() {
        Map<Long, List<BookWaitlistDto>> allWaitlists = waitlistService.getAllActiveWaitlists();
        return ResponseEntity.ok(allWaitlists);
    }

    /**
     * Override priority score (Admin/Librarian)
     */
    @PutMapping("/priority/{waitlistId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'LIBRARIAN')")
    public ResponseEntity<BookWaitlistDto> updatePriority(
            @PathVariable Long waitlistId,
            @RequestParam java.math.BigDecimal newPriority) {

        // This would require additional service methods to update priority
        // For now, return not implemented
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    /**
     * Get all active reservations (Admin/Librarian)
     */
    @GetMapping("/reservations")
    @PreAuthorize("hasAnyRole('ADMIN', 'LIBRARIAN')")
    public ResponseEntity<List<BookReservationDto>> getActiveReservations() {
        // This would require additional service methods
        // For now, return not implemented
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    /**
     * Clean up expired reservations (Admin/System)
     */
    @PostMapping("/cleanup-expired")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> cleanupExpiredReservations() {
        waitlistService.cleanupExpiredReservations();
        return ResponseEntity.ok().build();
    }
}
