package com.infy.lms.controller;

import com.infy.lms.dto.BorrowHistoryDTO;
import com.infy.lms.dto.BorrowRequestDTO;
import com.infy.lms.dto.ReturnRequestDTO;
import com.infy.lms.enums.BorrowStatus;
import com.infy.lms.exception.BorrowException;
import com.infy.lms.model.Book;
import com.infy.lms.model.BorrowRecord;
import com.infy.lms.repository.BookRepository;
import com.infy.lms.repository.UserRepository;
import com.infy.lms.service.BorrowService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class BorrowController {

    private final BorrowService borrowService;
    private final UserRepository userRepo;
    private final BookRepository bookRepo;
    private final com.infy.lms.repository.BorrowRecordRepository borrowRepo;

    // 1) Borrow a book
    @PreAuthorize("hasAnyRole('STUDENT','LIBRARIAN','ADMIN')")
    @PostMapping("/borrow")
    public ResponseEntity<?> borrowBook(@RequestBody BorrowRequestDTO req) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(borrowService.borrowBook(req));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", ex.getMessage()));
        }
    }

    // 2) Return a book
    @PreAuthorize("hasAnyRole('STUDENT','LIBRARIAN','ADMIN')")
    @PostMapping("/return")
    public ResponseEntity<?> returnBook(@RequestBody ReturnRequestDTO req) {
        if (req.getBorrowRecordId() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "borrowRecordId required"));
        }
        try {
            String res = borrowService.returnBook(req);
            return ResponseEntity.ok(Map.of("message", res));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", ex.getMessage()));
        }
    }

    // 3) Member history (owner or librarian/admin)
    @PreAuthorize("hasAnyRole('LIBRARIAN','ADMIN') or @securityService.getCurrentUserId() == #memberId")
    @GetMapping("/members/{memberId}/history")
    public ResponseEntity<List<BorrowHistoryDTO>> getHistory(@PathVariable Long memberId) {
        return ResponseEntity.ok(borrowService.getBorrowHistory(memberId));
    }

    // 4) Flexible find / filter endpoint
    // example: GET /api/borrow?studentId=1&bookId=2&status=BORROWED&overdue=true
    @PreAuthorize("hasAnyRole('LIBRARIAN','ADMIN') or #studentId == null or @securityService.getCurrentUserId() == #studentId")
    @GetMapping("/borrow")
    public ResponseEntity<List<BorrowHistoryDTO>> findBorrows(
            @RequestParam(required = false) Long studentId,
            @RequestParam(required = false) Long bookId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Boolean overdue
    ) {
        return ResponseEntity.ok(borrowService.findBorrows(studentId, bookId, status, overdue));
    }

    // 5) Overdue list (admin/librarian or owner via studentId)
    // GET /api/borrow/overdue?studentId=123
    @PreAuthorize("hasAnyRole('LIBRARIAN','ADMIN') or #studentId == null or @securityService.getCurrentUserId() == #studentId")
    @GetMapping("/borrow/overdue")
    public ResponseEntity<List<BorrowHistoryDTO>> getOverdue(@RequestParam(required = false) Long studentId) {
        return ResponseEntity.ok(borrowService.getOverdueBorrows(studentId));
    }

    // 6) Compute & persist penalty for a borrow record (admin/librarian)
    @PreAuthorize("hasAnyRole('LIBRARIAN','ADMIN')")
    @PostMapping("/borrow/{borrowId}/penalty/compute")
    public ResponseEntity<?> computePenalty(@PathVariable Long borrowId) {
        try {
            double penalty = borrowService.computeAndSetPenalty(borrowId);
            return ResponseEntity.ok(Map.of("borrowId", borrowId, "penalty", penalty));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", ex.getMessage()));
        }
    }

    // 7) Pay penalty for a borrow record.
    // Security: allow librarian/admin OR the student who owns the record (memberId query param)
    // POST /api/borrow/{borrowId}/penalty/pay?memberId=123&amount=100
    @PreAuthorize("hasAnyRole('LIBRARIAN','ADMIN') or @securityService.getCurrentUserId() == #memberId")
    @PostMapping("/borrow/{borrowId}/penalty/pay")
    public ResponseEntity<?> payPenalty(
            @PathVariable Long borrowId,
            @RequestParam Long memberId,
            @RequestParam double amount
    ) {
        try {
            double remaining = borrowService.payPenalty(borrowId, amount);
            return ResponseEntity.ok(Map.of("borrowId", borrowId, "remaining", remaining));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", ex.getMessage()));
        }
    }

    // 8) Manual reconcile trigger (admin only). Useful for testing.
    @PreAuthorize("hasAnyRole('ADMIN')")
    @PostMapping("/borrow/reconcile")
    public ResponseEntity<?> reconcileNow() {
        try {
            borrowService.reconcileOverdues();
            return ResponseEntity.ok(Map.of("message", "Reconciliation triggered"));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", ex.getMessage()));
        }
    }

    // --- Penalty endpoints ---

    // Member: list their ALL penalties (pending, paid, waived)
    @PreAuthorize("hasAnyRole('LIBRARIAN','ADMIN') or @securityService.getCurrentUserId() == #memberId")
    @GetMapping("/members/{memberId}/penalties")
    public ResponseEntity<List<com.infy.lms.dto.PenaltyDTO>> getMemberPenalties(@PathVariable Long memberId) {
        List<com.infy.lms.dto.PenaltyDTO> list = borrowService.getAllPenaltiesForMember(memberId);
        return ResponseEntity.ok(list);
    }

    // Member: list their PENDING penalties only (for compatibility)
    @PreAuthorize("hasAnyRole('LIBRARIAN','ADMIN') or @securityService.getCurrentUserId() == #memberId")
    @GetMapping("/members/{memberId}/penalties/pending")
    public ResponseEntity<List<com.infy.lms.dto.PenaltyDTO>> getMemberPendingPenalties(@PathVariable Long memberId) {
        List<com.infy.lms.dto.PenaltyDTO> list = borrowService.getPendingPenaltiesForMember(memberId);
        return ResponseEntity.ok(list);
    }

    // Admin/Librarian: list all pending penalties
    @PreAuthorize("hasAnyRole('LIBRARIAN','ADMIN')")
    @GetMapping("/penalties/pending")
    public ResponseEntity<List<com.infy.lms.dto.PenaltyDTO>> getAllPendingPenalties() {
        List<com.infy.lms.dto.PenaltyDTO> list = borrowService.getAllPendingPenalties();
        return ResponseEntity.ok(list);
    }



    // Pay a penalty (student can pay their own; admin/librarian can pay any)
    @PreAuthorize("hasAnyRole('LIBRARIAN','ADMIN') or hasRole('STUDENT')")
    @PostMapping("/borrow/{borrowRecordId}/pay")
    public ResponseEntity<Map<String, String>> payPenaltyEndpoint(@PathVariable Long borrowRecordId,
                                                                  @RequestBody com.infy.lms.dto.PaymentRequestDTO payment) {
        String res = borrowService.payPenalty(borrowRecordId, payment.getAmount());
        return ResponseEntity.ok(Map.of("message", res));
    }

}
