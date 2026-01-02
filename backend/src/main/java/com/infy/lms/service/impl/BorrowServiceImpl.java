package com.infy.lms.service.impl;

import com.infy.lms.dto.BorrowHistoryDTO;
import com.infy.lms.dto.BorrowRequestDTO;
import com.infy.lms.dto.PenaltyDTO;
import com.infy.lms.dto.ReturnRequestDTO;
import com.infy.lms.enums.BorrowStatus;
import com.infy.lms.enums.Role;
import com.infy.lms.exception.BorrowException;
import com.infy.lms.exception.OutOfStockException;
import com.infy.lms.model.Book;
import com.infy.lms.model.BorrowRecord;
import com.infy.lms.model.User;
import com.infy.lms.repository.BookRepository;
import com.infy.lms.repository.BorrowRecordRepository;
import com.infy.lms.repository.UserRepository;
import com.infy.lms.service.BorrowService;
import com.infy.lms.service.EmailService;
import com.infy.lms.service.WaitlistService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

/**
 * BorrowServiceImpl
 *
 * NOTE: This implementation assumes inventory (availableCopies/issuedCopies) is managed by the caller.
 * For approve→issue flow, BookRequestServiceImpl is expected to perform the atomic decrement
 * via BookRepository.decrementAvailableAndIncrementIssuedIfAvailable(...) BEFORE calling borrowBook(...).
 *
 * If you prefer borrowBook(...) to be the single place that modifies inventory, move the atomic update
 * into borrowBook and remove it from callers (approveRequest). Do NOT have both places decrement inventory.
 */
@Service
@RequiredArgsConstructor
public class BorrowServiceImpl implements BorrowService {

    private final BorrowRecordRepository borrowRepo;
    private final BookRepository bookRepo;
    private final UserRepository userRepo;
    private final EmailService emailService;
    private final WaitlistService waitlistService;

    @Value("${lms.default-loan-days:14}")
    private long defaultLoanDays;

    @Value("${lms.fine-per-day:10}")
    private double finePerDay; // used to compute per-day fine; converted to BigDecimal when applied

    // -----------------------
    // Core operations
    // -----------------------

    /**
     * Borrow (issue) a book.
     *
     * IMPORTANT: This method **does not** change Book.availableCopies/issuedCopies.
     * The caller must ensure inventory is updated atomically before invoking this method.
     * (e.g. BookRequestServiceImpl.approveRequest(...) should call the atomic repo update and then call this).
     *
     * If you want borrowBook to also update inventory, move the repository atomic update into this method
     * and remove it from callers. But do not perform inventory updates in both places.
     */
    @Override
    @Transactional
    public BorrowRecord borrowBook(BorrowRequestDTO request) {

        User student = userRepo.findById(request.getStudentId())
                .orElseThrow(() -> new BorrowException("Student not found"));

        Book book = bookRepo.findById(request.getBookId())
                .orElseThrow(() -> new BorrowException("Book not found"));

        // NOTE: Removed inventory decrement from here intentionally to avoid double-decrement.
        // Inventory must be decremented by the caller (approveRequest) if required.

        Instant issueDate = request.getIssueDate() == null ? Instant.now() : request.getIssueDate();
        Instant dueDate = request.getDueDate() == null ? issueDate.plus(Duration.ofDays(defaultLoanDays)) : request.getDueDate();

        BorrowRecord record = BorrowRecord.builder()
                .student(student)
                .book(book)
                .borrowedAt(issueDate)
                .dueDate(dueDate)
                .status(BorrowStatus.BORROWED)
                .penaltyAmount(BigDecimal.ZERO)
                .penaltyType(BorrowRecord.PenaltyType.NONE)
                .penaltyStatus(BorrowRecord.PenaltyStatus.NONE)
                // Ensure boolean flags are explicitly set so DB INSERT includes columns (avoids schema default issues)
                .studentReportedDamaged(false)
                .studentReportedLost(false)
                .build();

        borrowRepo.save(record);
        return record;
    }

    /**
     * Return a borrowed book.
     * This method computes penalties (damage/lost/late) and updates inventory.
     */
    @Override
    @Transactional
    public String returnBook(ReturnRequestDTO request) {

        System.out.println("🔍 RETURN PROCESS STARTED:");
        System.out.println("📋 Request DTO:");
        System.out.println("   borrowRecordId: " + request.getBorrowRecordId());
        System.out.println("   returnDate: " + request.getReturnDate());
        System.out.println("   damaged: " + request.isDamaged());
        System.out.println("   lost: " + request.isLost());

        BorrowRecord record = borrowRepo.findById(request.getBorrowRecordId())
                .orElseThrow(() -> new BorrowException("Borrow record not found with ID: " + request.getBorrowRecordId()));

        System.out.println("📋 BorrowRecord found:");
        System.out.println("   Record ID: " + record.getId());
        System.out.println("   Book ID: " + (record.getBook() != null ? record.getBook().getId() : "NULL"));
        System.out.println("   Student ID: " + (record.getStudent() != null ? record.getStudent().getId() : "NULL"));
        System.out.println("   Already Returned: " + (record.getReturnedAt() != null));

        if (record.getReturnedAt() != null) {
            throw new BorrowException("This borrow record has already been returned on: " + record.getReturnedAt());
        }

        Instant returnedAt = (request.getReturnDate() == null)
                ? Instant.now()
                : request.getReturnDate().atStartOfDay(ZoneOffset.UTC).toInstant();

        boolean reportedDamaged = request.isDamaged();
        boolean reportedLost = request.isLost();

        Book book = bookRepo.findById(record.getBook().getId())
                .orElseThrow(() -> new BorrowException("Book not found for penalty calculation"));

        // Initialize penalty variables
        BigDecimal totalPenalty = BigDecimal.ZERO;
        BorrowRecord.PenaltyType primaryPenaltyType = BorrowRecord.PenaltyType.NONE;
        boolean hasDamageOrLossPenalty = false;

        // DAMAGE / LOST handling
        if (reportedDamaged || reportedLost) {
            BorrowRecord.PenaltyType penaltyType = reportedLost ? BorrowRecord.PenaltyType.LOST : BorrowRecord.PenaltyType.DAMAGE;

            // Get book MRP for penalty calculation (full MRP for damage/loss)
            System.out.println("🔍 PENALTY CALCULATION: Book MRP = " + book.getMrp() + ", Book Title = '" + book.getTitle() + "'");

            BigDecimal replacement = BigDecimal.ZERO;
            if (book.getMrp() != null && book.getMrp() > 0) {
                replacement = BigDecimal.valueOf(book.getMrp());
                System.out.println("✅ PENALTY: Book has MRP of ₹" + replacement + " - using as replacement cost");
            } else {
                System.out.println("⚠️ PENALTY: Book has no MRP value or MRP is 0 - setting penalty to ₹0");
            }

            totalPenalty = totalPenalty.add(replacement);
            primaryPenaltyType = penaltyType;
            hasDamageOrLossPenalty = true;

            System.out.println("💰 DAMAGE/LOSS PENALTY: Type=" + penaltyType + ", Amount=₹" + replacement);

            // If LOST -> decrement total and available counts (we already decremented available on borrow)
            if (reportedLost) {
                Integer avail = book.getAvailableCopies() == null ? 0 : book.getAvailableCopies();
                Integer total = book.getTotalCopies() == null ? 0 : book.getTotalCopies();
                // The book was issued, so available might already be decremented. Reduce total by 1 for lost copy.
                book.setTotalCopies(Math.max(0, total - 1));
                // ensure available doesn't go negative
                book.setAvailableCopies(Math.max(0, avail));
                int issued = Math.max(0, (book.getTotalCopies() == null ? 0 : book.getTotalCopies())
                        - (book.getAvailableCopies() == null ? 0 : book.getAvailableCopies()));
                book.setIssuedCopies(issued);
                bookRepo.save(book);
            }
        }

        // Calculate days late using calendar days
        long daysLate = 0;
        if (returnedAt.isAfter(record.getDueDate())) {
            LocalDate returnLocalDate = returnedAt.atZone(ZoneId.systemDefault()).toLocalDate();
            LocalDate dueLocalDate = record.getDueDate().atZone(ZoneId.systemDefault()).toLocalDate();
            daysLate = ChronoUnit.DAYS.between(dueLocalDate, returnLocalDate);
            if (daysLate < 0) daysLate = 0;
        }

        // LATE calculation - 10% of MRP per day overdue
        if (daysLate > 0) {
            // Calculate 10% of MRP per day for each day overdue
            System.out.println("🔍 LATE PENALTY: Book MRP = " + book.getMrp() + ", Days Late = " + daysLate + ", Book Title = '" + book.getTitle() + "'");

            BigDecimal mrp = BigDecimal.valueOf(book.getMrp() != null ? book.getMrp().doubleValue() : 0.0);
            System.out.println("🔍 LATE PENALTY: MRP BigDecimal = " + mrp);

            if (mrp.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal penaltyPerDay = mrp.multiply(BigDecimal.valueOf(0.1)).setScale(2, BigDecimal.ROUND_HALF_UP);
                BigDecimal latePenalty = penaltyPerDay.multiply(BigDecimal.valueOf(daysLate)).setScale(2, BigDecimal.ROUND_HALF_UP);
                totalPenalty = totalPenalty.add(latePenalty);

                System.out.println("💰 LATE PENALTY: ₹" + penaltyPerDay + " per day × " + daysLate + " days = ₹" + latePenalty);

                // Determine primary penalty type (prioritize damage/lost over late)
                if (!hasDamageOrLossPenalty) {
                    primaryPenaltyType = BorrowRecord.PenaltyType.LATE;
                }

                System.out.println("💰 LATE RESULT: Type=" + primaryPenaltyType + ", Amount=₹" + totalPenalty + ", Status=PENDING");
            } else {
                System.out.println("⚠️ LATE PENALTY: Book has no MRP value or MRP is 0 - no late penalty applied");
            }
        } else {
            System.out.println("✅ ON TIME RETURN: No late penalty for book '" + book.getTitle() + "'");
        }

        // Set return details
        record.setReturnedAt(returnedAt);

        // Set final penalty values
        record.setPenaltyAmount(totalPenalty);
        record.setPenaltyType(primaryPenaltyType);
        record.setPenaltyStatus(totalPenalty.compareTo(BigDecimal.ZERO) > 0 ? BorrowRecord.PenaltyStatus.PENDING : BorrowRecord.PenaltyStatus.NONE);

        // Set status based on return condition and penalties (priority: lost > damaged > late > on-time)
        if (reportedLost) {
            record.setStatus(BorrowStatus.LOST);
        } else if (reportedDamaged) {
            record.setStatus(BorrowStatus.DAMAGED);
        } else if (daysLate > 0) {
            record.setStatus(BorrowStatus.LATE_RETURNED);
        } else {
            record.setStatus(BorrowStatus.RETURNED);
        }

        borrowRepo.save(record);

        // increment available copies atomically (repository method expected)
        int rows = bookRepo.incrementAvailableCopies(record.getBook().getId());
        if (rows == 0) {
            throw new BorrowException("Failed to update inventory while returning. Try again.");
        }

        // recompute issued copies
        Book fresh = bookRepo.findById(record.getBook().getId())
                .orElseThrow(() -> new BorrowException("Book not found after return"));

        int total = fresh.getTotalCopies() == null ? 0 : fresh.getTotalCopies();
        int available = fresh.getAvailableCopies() == null ? 0 : fresh.getAvailableCopies();
        fresh.setIssuedCopies(Math.max(0, total - available));
        bookRepo.save(fresh);

        // Handle book allocation for returned books (only if not lost)
        if (!reportedLost) {
            // Check for pending book requests first before allocating to waitlist
            // TODO: Implement pending request check

            // For now, prioritize waitlist allocation
            User waitlistStudent = waitlistService.handleBookReturn(fresh);
            if (waitlistStudent != null) {
            // Immediately issue the book to the waitlist student
            BorrowRequestDTO borrowRequest = new BorrowRequestDTO(
                    waitlistStudent.getId(),
                    fresh.getId(),
                    Instant.now(),
                    Instant.now().plus(Duration.ofDays(defaultLoanDays))
            );

                try {
                    borrowBook(borrowRequest);
                    System.out.println("✅ BOOK ISSUED: Book '" + fresh.getTitle() +
                                     "' automatically issued to waitlist student '" +
                                     waitlistStudent.getName() + "'");
                } catch (Exception e) {
                    System.out.println("❌ BOOK ISSUE FAILED: Could not issue book to waitlist student: " + e.getMessage());
                }
            }
        }

        notifyReturn(record);

        if (record.getPenaltyAmount() != null && record.getPenaltyAmount().compareTo(BigDecimal.ZERO) > 0) {
            return "Book returned successfully! Penalty applied: " + record.getPenaltyAmount().toPlainString();
        } else {
            return "Book returned successfully! No penalty.";
        }
    }

    // -----------------------
    // Query / History
    // -----------------------

    @Override
    @Transactional(readOnly = true)
    public List<BorrowHistoryDTO> getBorrowHistory(Long studentId) {
        User student = userRepo.findById(studentId)
                .orElseThrow(() -> new BorrowException("Student not found"));

        return borrowRepo.findByStudent(student)
                .stream()
                .map(this::toHistoryDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<BorrowHistoryDTO> findBorrows(Long studentId, Long bookId, String status, Boolean overdue) {
        Instant now = Instant.now();

        // Then fetch records based on filters - prefer filtered queries when possible
        List<BorrowRecord> list;
        if (studentId != null) {
            list = borrowRepo.findByStudentId(studentId);
        } else {
            list = borrowRepo.findAll();
        }

        return list.stream()
                .filter(br -> studentId == null || (br.getStudent() != null && br.getStudent().getId().equals(studentId)))
                .filter(br -> bookId == null || (br.getBook() != null && br.getBook().getId().equals(bookId)))
                .filter(br -> status == null || br.getStatus() == null || br.getStatus().name().equalsIgnoreCase(status))
                .filter(br -> {
                    if (overdue == null) return true;
                    boolean isOverdue = br.isOverdue();
                    return overdue ? isOverdue : !isOverdue;
                })
                .map(this::toHistoryDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public List<BorrowHistoryDTO> getOverdueBorrows(Long studentId) {
        // Use current time to detect overdue books accurately
        Instant now = Instant.now();

        List<BorrowRecord> overdue;
        if (studentId == null) {
            overdue = borrowRepo.findOverdue(now);
        } else {
            overdue = borrowRepo.findOverdueByStudent(studentId, now);
        }

        // Ensure statuses are updated to OVERDUE for consistency
        overdue.stream()
            .filter(br -> br.getStatus() != BorrowStatus.OVERDUE)
            .forEach(br -> {
                br.setStatus(BorrowStatus.OVERDUE);
                borrowRepo.save(br);
            });

        return overdue.stream().map(this::toHistoryDto).collect(Collectors.toList());
    }

    // -----------------------
    // Penalty operations
    // -----------------------

    @Override
    @Transactional
    public double computeAndSetPenalty(Long borrowRecordId) {
        BorrowRecord record = borrowRepo.findById(borrowRecordId)
                .orElseThrow(() -> new BorrowException("Borrow record not found"));

        // Get book MRP for penalty calculation
        Book book = record.getBook();
        BigDecimal mrp = BigDecimal.valueOf(book.getMrp() != null ? book.getMrp().doubleValue() : 0.0);
        BigDecimal penaltyPerDay = mrp.multiply(BigDecimal.valueOf(0.1)).setScale(2, BigDecimal.ROUND_HALF_UP);

        // only compute if still outstanding or if returned but penalty not set
        if (record.isOverdue()) {
            long daysLate = record.daysOverdue();
            BigDecimal totalPenalty = penaltyPerDay.multiply(BigDecimal.valueOf(daysLate)).setScale(2, BigDecimal.ROUND_HALF_UP);
            record.setPenaltyAmount(daysLate > 0 ? totalPenalty : BigDecimal.ZERO);
            record.setPenaltyType(daysLate > 0 ? BorrowRecord.PenaltyType.LATE : BorrowRecord.PenaltyType.NONE);
            record.setPenaltyStatus(totalPenalty.compareTo(BigDecimal.ZERO) > 0 ? BorrowRecord.PenaltyStatus.PENDING : BorrowRecord.PenaltyStatus.NONE);
            borrowRepo.save(record);
            return totalPenalty.doubleValue();
        }

        // if returned, ensure penalty is set (idempotent)
        if (record.getReturnedAt() != null && (record.getPenaltyAmount() == null || record.getPenaltyAmount().compareTo(BigDecimal.ZERO) == 0) && record.getDueDate() != null && record.getReturnedAt().isAfter(record.getDueDate())) {
            long daysLate = Duration.between(record.getDueDate(), record.getReturnedAt()).toDays();
            if (daysLate < 0) daysLate = 0;
            BigDecimal totalPenalty = penaltyPerDay.multiply(BigDecimal.valueOf(daysLate)).setScale(2, BigDecimal.ROUND_HALF_UP);
            record.setPenaltyAmount(daysLate > 0 ? totalPenalty : BigDecimal.ZERO);
            record.setPenaltyType(daysLate > 0 ? BorrowRecord.PenaltyType.LATE : BorrowRecord.PenaltyType.NONE);
            record.setPenaltyStatus(totalPenalty.compareTo(BigDecimal.ZERO) > 0 ? BorrowRecord.PenaltyStatus.PENDING : BorrowRecord.PenaltyStatus.NONE);
            borrowRepo.save(record);
            return totalPenalty.doubleValue();
        }

        return record.getPenaltyAmount() == null ? 0d : record.getPenaltyAmount().doubleValue();
    }

    @Override
    @Transactional
    @Deprecated
    public double payPenaltyTest(Long borrowRecordId, double amountPaid) {
        // Delegate to the main payPenalty method
        return payPenalty(borrowRecordId, amountPaid);
    }

    @Override
    @Transactional
    public double payPenalty(Long borrowRecordId, double amountPaid) {
        BorrowRecord record = borrowRepo.findById(borrowRecordId)
                .orElseThrow(() -> new BorrowException("Borrow record not found"));

        BigDecimal owed = record.getPenaltyAmount() == null ? BigDecimal.ZERO : record.getPenaltyAmount();
        BigDecimal paid = BigDecimal.valueOf(amountPaid).setScale(2, BigDecimal.ROUND_HALF_UP);

        if (paid.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BorrowException("Payment amount must be greater than zero");
        }

        BigDecimal remaining = owed.subtract(paid);
        if (remaining.compareTo(BigDecimal.ZERO) <= 0) {
            // fully paid (or overpaid) -> mark PAID but keep original penalty amount for display
            // record.setPenaltyAmount(BigDecimal.ZERO); // Commented out to preserve original amount
            record.setPenaltyStatus(BorrowRecord.PenaltyStatus.PAID);
            // Keep penaltyType to show what kind of penalty was paid
            borrowRepo.save(record);
            return 0d;
        } else {
            // partially paid -> keep pending with reduced amount
            record.setPenaltyAmount(remaining);
            record.setPenaltyStatus(BorrowRecord.PenaltyStatus.PENDING);
            borrowRepo.save(record);
            return remaining.doubleValue();
        }
    }

    // -----------------------
    // Penalty workflow
    // -----------------------

    @Override
    @Transactional(readOnly = true)
    public List<com.infy.lms.dto.PenaltyDTO> getPendingPenaltiesForMember(Long memberId) {
        User student = userRepo.findById(memberId)
                .orElseThrow(() -> new BorrowException("Student not found"));

        return borrowRepo.findByStudent(student).stream()
                .filter(r -> r.getPenaltyAmount() != null && r.getPenaltyAmount().compareTo(java.math.BigDecimal.ZERO) > 0
                        && r.getPenaltyStatus() == BorrowRecord.PenaltyStatus.PENDING)
                .map(this::toPenaltyDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<com.infy.lms.dto.PenaltyDTO> getAllPenaltiesForMember(Long memberId) {
        User student = userRepo.findById(memberId)
                .orElseThrow(() -> new BorrowException("Student not found"));

        return borrowRepo.findByStudent(student).stream()
                .filter(r -> r.getPenaltyType() != BorrowRecord.PenaltyType.NONE &&
                             r.getPenaltyStatus() != BorrowRecord.PenaltyStatus.NONE)
                .map(this::toPenaltyDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<com.infy.lms.dto.PenaltyDTO> getAllPendingPenalties() {
        List<BorrowRecord> allRecords = borrowRepo.findAll();
        System.out.println("🔍 getAllPendingPenalties: Found " + allRecords.size() + " total borrow records");

        // First, calculate penalties for active overdue books that don't have them yet
        for (BorrowRecord record : allRecords) {
            if (record.isOverdue()) {
                // Check if penalty is already calculated
                boolean hasPenalty = record.getPenaltyAmount() != null && record.getPenaltyAmount().compareTo(BigDecimal.ZERO) > 0;
                if (!hasPenalty) {
                    // Calculate penalty for this overdue book
                    Book book = record.getBook();
                    BigDecimal mrp = BigDecimal.valueOf(book.getMrp() != null ? book.getMrp().doubleValue() : 0.0);
                    BigDecimal penaltyPerDay = mrp.multiply(BigDecimal.valueOf(0.1)).setScale(2, BigDecimal.ROUND_HALF_UP);

                    long daysLate = record.daysOverdue();
                    if (daysLate > 0) {
                        BigDecimal totalPenalty = penaltyPerDay.multiply(BigDecimal.valueOf(daysLate)).setScale(2, BigDecimal.ROUND_HALF_UP);
                        record.setPenaltyAmount(totalPenalty);
                        record.setPenaltyType(BorrowRecord.PenaltyType.LATE);
                        record.setPenaltyStatus(BorrowRecord.PenaltyStatus.PENDING);
                        record.setStatus(BorrowStatus.OVERDUE);
                        borrowRepo.save(record);
                        System.out.println("💰 Calculated penalty for overdue book: ID=" + record.getId() +
                                         ", Days late=" + daysLate + ", Amount=₹" + totalPenalty +
                                         ", Book MRP=₹" + (book.getMrp() != null ? book.getMrp() : 0));
                    } else {
                        // Clear any incorrect penalty flags for books that are not actually overdue
                        record.setPenaltyAmount(BigDecimal.ZERO);
                        record.setPenaltyType(BorrowRecord.PenaltyType.NONE);
                        record.setPenaltyStatus(BorrowRecord.PenaltyStatus.NONE);
                        if (record.getStatus() == BorrowStatus.OVERDUE) {
                            record.setStatus(BorrowStatus.BORROWED);
                        }
                        borrowRepo.save(record);
                        System.out.println("🧹 Cleared penalty flags for non-overdue book: ID=" + record.getId());
                    }
                }
            }
        }

        List<com.infy.lms.dto.PenaltyDTO> pendingPenalties = allRecords.stream()
                .filter(r -> {
                    boolean hasPenalty = r.getPenaltyAmount() != null && r.getPenaltyAmount().compareTo(java.math.BigDecimal.ZERO) > 0;
                    boolean isPending = r.getPenaltyStatus() == BorrowRecord.PenaltyStatus.PENDING;
                    if (hasPenalty && isPending) {
                        System.out.println("📋 Found pending penalty: BorrowRecord ID=" + r.getId() +
                                         ", Student=" + (r.getStudent() != null ? r.getStudent().getName() : "Unknown") +
                                         ", Book=" + (r.getBook() != null ? r.getBook().getTitle() : "Unknown") +
                                         ", Amount=" + r.getPenaltyAmount() +
                                         ", Status=" + r.getPenaltyStatus() +
                                         ", Returned=" + (r.getReturnedAt() != null));
                    }
                    return hasPenalty && isPending;
                })
                .map(this::toPenaltyDto)
                .collect(Collectors.toList());

        System.out.println("✅ getAllPendingPenalties: Returning " + pendingPenalties.size() + " pending penalties");
        return pendingPenalties;
    }

    @Override
    @Transactional(readOnly = true)
    public List<com.infy.lms.dto.PenaltyDTO> getAllPenalties() {
        List<BorrowRecord> allRecords = borrowRepo.findAll();
        System.out.println("🔍 getAllPenalties: Found " + allRecords.size() + " total borrow records");

        List<com.infy.lms.dto.PenaltyDTO> allPenalties = allRecords.stream()
                .filter(r -> r.getPenaltyType() != BorrowRecord.PenaltyType.NONE &&
                             r.getPenaltyStatus() != BorrowRecord.PenaltyStatus.NONE &&
                             r.getReturnedAt() != null) // Only penalties for books that have been returned
                .map(this::toPenaltyDto)
                .collect(Collectors.toList());

        System.out.println("✅ getAllPenalties: Returning " + allPenalties.size() + " total penalties for returned books");
        return allPenalties;
    }

    @Override
    @Transactional
    public String payPenalty(Long borrowRecordId, java.math.BigDecimal amount) {
        if (amount == null || amount.compareTo(java.math.BigDecimal.ZERO) <= 0) {
            throw new BorrowException("Payment amount must be > 0");
        }

        BorrowRecord record = borrowRepo.findById(borrowRecordId)
                .orElseThrow(() -> new BorrowException("Borrow record not found"));

        java.math.BigDecimal penalty = record.getPenaltyAmount() == null ? java.math.BigDecimal.ZERO : record.getPenaltyAmount();

        if (penalty.compareTo(java.math.BigDecimal.ZERO) == 0) {
            return "No penalty outstanding for this borrow record.";
        }

        // apply payment
        if (amount.compareTo(penalty) >= 0) {
            // full payment or overpay - keep original penalty amount for display
            // record.setPenaltyAmount(java.math.BigDecimal.ZERO); // Commented out to preserve original amount
            record.setPenaltyStatus(BorrowRecord.PenaltyStatus.PAID);
            // Keep penaltyType to show what kind of penalty was paid
            borrowRepo.save(record);

        // notify user if possible
        userRepo.findById(record.getStudent().getId()).ifPresent(student -> {
            try {
                String to = student.getEmail();
                String subject = "Penalty Payment Received - Payment Confirmed";
                String studentName = student.getName() != null && !student.getName().trim().isEmpty() ? student.getName() : "Valued Member";
                String bookTitle = record.getBook().getTitle() != null ? record.getBook().getTitle() : "Library Book";
                String bookAuthor = record.getBook().getAuthor() != null ? record.getBook().getAuthor() : "Unknown Author";
                String paymentAmount = "₹" + amount.toPlainString();
                String paymentDate = java.time.format.DateTimeFormatter.ofPattern("MMMM dd, yyyy 'at' HH:mm")
                        .format(java.time.LocalDateTime.now());

                String htmlBody = String.format(
                    """
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Penalty Payment Confirmed</title>
                        <style>
                            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: #f9f9f9; }
                            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
                            .header { background: linear-gradient(135deg, #28a745 0%%, #20c997 100%%); color: white; padding: 30px 20px; text-align: center; }
                            .content { padding: 30px 20px; }
                            .success-card { background: #d4edda; border-left: 4px solid #28a745; padding: 20px; margin: 20px 0; border-radius: 8px; color: #155724; }
                            .book-card { background: #f8f9fa; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; border-radius: 8px; }
                            .payment-summary { background: linear-gradient(135deg, #e8f5e8 0%%, #f0f8f0 100%%); padding: 20px; margin: 20px 0; border-radius: 8px; border: 2px solid #28a745; text-align: center; }
                            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; border-top: 1px solid #e9ecef; }
                            h1 { margin: 0; font-size: 28px; }
                            h2 { color: #28a745; margin-top: 0; }
                            h3 { color: #155724; margin: 0 0 10px 0; }
                            p { line-height: 1.6; }
                            .highlight { color: #28a745; font-weight: 600; }
                            .payment-amount { font-size: 32px; font-weight: 700; color: #28a745; margin: 10px 0; }
                            .checkmark { font-size: 48px; margin-bottom: 10px; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1>Payment Confirmed</h1>
                                <p>Thank you for settling your library dues</p>
                            </div>

                            <div class="content">
                                <p>Hello <span class="highlight">%s</span>,</p>

                                <div class="success-card">
                                    <div class="checkmark">✓</div>
                                    <h3>Payment Successfully Processed!</h3>
                                    <p>We have received and processed your penalty payment. Your account is now clear of outstanding dues.</p>
                                </div>

                                <div class="payment-summary">
                                    <h2>Payment Details</h2>
                                    <div class="payment-amount">%s</div>
                                    <p><strong>Payment Date:</strong> %s</p>
                                    <p><strong>Status:</strong> <span style="color: #28a745; font-weight: 600;">FULLY PAID</span></p>
                                </div>

                                <div class="book-card">
                                    <h2>Related Book Information</h2>
                                    <p><strong>Book Title:</strong> %s</p>
                                    <p><strong>Author:</strong> %s</p>
                                    <p><strong>Penalty Status:</strong> <span style="color: #28a745; font-weight: 600;">CLEARED</span></p>
                                </div>

                                <p>Thank you for your prompt payment and continued commitment to our library community. We appreciate your responsibility in maintaining your borrowing privileges.</p>

                                <p>If you have any questions about this payment or your account status, please don't hesitate to contact our library staff.</p>

                                <p>Happy reading!</p>

                                <p>Best regards,<br>
                                <strong>Library Management System</strong></p>
                            </div>

                            <div class="footer">
                                <p><strong>Library Management System</strong></p>
                                <p>Contact us at support@lms.edu | Visit us at library@lms.edu</p>
                                <p>Payment processed on %s</p>
                                <p>© 2025 Library Management System. All rights reserved.</p>
                            </div>
                        </div>
                    </body>
                    </html>
                    """,
                    studentName,
                    paymentAmount,
                    paymentDate,
                    bookTitle,
                    bookAuthor,
                    paymentDate
                );

                emailService.sendEmail(to, subject, htmlBody);
            } catch (Exception e) {
                System.err.println("Failed to send payment confirmation email: " + e.getMessage());
                e.printStackTrace();
            }
        });

            return "Penalty paid in full. Thank you.";
        } else {
            // partial payment
            java.math.BigDecimal remaining = penalty.subtract(amount);
            record.setPenaltyStatus(BorrowRecord.PenaltyStatus.PENDING);
            borrowRepo.save(record);

            userRepo.findById(record.getStudent().getId()).ifPresent(student -> {
                try {
                    String to = student.getEmail();
                    String subject = "💰 Partial Penalty Payment Received - Payment Update";
                    String studentName = student.getName() != null && !student.getName().trim().isEmpty() ? student.getName() : "Valued Member";
                    String bookTitle = record.getBook().getTitle() != null ? record.getBook().getTitle() : "Library Book";
                    String bookAuthor = record.getBook().getAuthor() != null ? record.getBook().getAuthor() : "Unknown Author";
                    String paymentAmount = "₹" + amount.toPlainString();
                    String remainingAmount = "₹" + remaining.toPlainString();
                    String totalPenalty = "₹" + penalty.toPlainString();
                    String paymentDate = java.time.format.DateTimeFormatter.ofPattern("MMMM dd, yyyy 'at' HH:mm")
                            .format(java.time.LocalDateTime.now());

                    String htmlBody = String.format(
                        """
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>Partial Payment Received</title>
                            <style>
                                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: #f9f9f9; }
                                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
                                .header { background: linear-gradient(135deg, #ffc107 0%, #ff8c00 100%); color: white; padding: 30px 20px; text-align: center; }
                                .content { padding: 30px 20px; }
                                .progress-card { background: linear-gradient(135deg, #fff3cd 0%, #ffecb3 100%); border-left: 4px solid #ffc107; padding: 20px; margin: 20px 0; border-radius: 8px; color: #856404; }
                                .book-card { background: #f8f9fa; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 8px; }
                                .payment-summary { background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); padding: 20px; margin: 20px 0; border-radius: 8px; border: 2px solid #2196f3; text-align: center; }
                                .warning-card { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 8px; color: #856404; }
                                .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; border-top: 1px solid #e9ecef; }
                                h1 { margin: 0; font-size: 28px; }
                                h2 { color: #856404; margin-top: 0; }
                                h3 { color: #0d47a1; margin: 0 0 10px 0; }
                                p { line-height: 1.6; }
                                .highlight { color: #0d47a1; font-weight: 600; }
                                .payment-amount { font-size: 28px; font-weight: 700; color: #1976d2; margin: 10px 0; }
                                .remaining-amount { font-size: 24px; font-weight: 700; color: #f57c00; margin: 10px 0; }
                                .progress-bar { background: #e0e0e0; border-radius: 10px; height: 10px; margin: 15px 0; overflow: hidden; }
                                .progress-fill { background: linear-gradient(90deg, #4caf50, #66bb6a); height: 100%; border-radius: 10px; }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <div class="header">
                                    <h1>💰 Partial Payment Received</h1>
                                    <p>Thank you for your payment towards library dues</p>
                                </div>

                                <div class="content">
                                    <p>Hello <span class="highlight">%s</span>,</p>

                                    <div class="progress-card">
                                        <div style="font-size: 36px; margin-bottom: 10px;">⏳</div>
                                        <h2>Payment Progress Update</h2>
                                        <p>We have received your partial payment and applied it towards your outstanding penalty. Your account is being updated accordingly.</p>
                                    </div>

                                    <div class="payment-summary">
                                        <h3>💳 Payment Details</h3>
                                        <div class="payment-amount">%s Received</div>
                                        <p><strong>Payment Date:</strong> %s</p>
                                        <p><strong>Total Penalty:</strong> %s</p>
                                        <p><strong>Remaining Balance:</strong></p>
                                        <div class="remaining-amount">%s</div>
                                    </div>

                                    <div class="book-card">
                                        <h2>📖 Related Book Information</h2>
                                        <p><strong>Book Title:</strong> %s</p>
                                        <p><strong>Author:</strong> %s</p>
                                        <p><strong>Penalty Status:</strong> <span style="color: #f57c00; font-weight: 600;">PARTIALLY PAID</span></p>
                                    </div>

                                    <div class="warning-card">
                                        <h2>⚠️ Outstanding Balance</h2>
                                        <p>You still have an outstanding penalty balance that needs to be settled. Please complete your payment as soon as possible to avoid any restrictions on your library borrowing privileges.</p>
                                        <p>You can make additional payments through your student dashboard or by visiting the library in person.</p>
                                    </div>

                                    <p>If you have any questions about your penalty balance or payment options, please contact our library staff immediately.</p>

                                    <p>Thank you for your continued commitment to settling your library dues.</p>

                                    <p>Best regards,<br>
                                    <strong>Library Management System</strong></p>
                                </div>

                                <div class="footer">
                                    <p><strong>Library Management System</strong></p>
                                    <p>Contact us at support@lms.edu | Visit us at library@lms.edu</p>
                                    <p>Payment processed on %s</p>
                                    <p>© 2025 Library Management System. All rights reserved.</p>
                                </div>
                            </div>
                        </body>
                        </html>
                        """,
                        studentName,
                        paymentAmount,
                        paymentDate,
                        totalPenalty,
                        remainingAmount,
                        bookTitle,
                        bookAuthor,
                        paymentDate
                    ).trim();

                    emailService.sendEmail(to, subject, htmlBody);
                } catch (Exception ignored) {}
            });

            return "Partial payment accepted. Remaining penalty: " + remaining.toString();
        }
    }

    @Override
    @Transactional
    public String waivePenalty(Long borrowRecordId) {
        BorrowRecord record = borrowRepo.findById(borrowRecordId)
                .orElseThrow(() -> new BorrowException("Borrow record not found"));

        BigDecimal owed = record.getPenaltyAmount() == null ? BigDecimal.ZERO : record.getPenaltyAmount();

        if (owed.compareTo(BigDecimal.ZERO) == 0) {
            return "No penalty outstanding for this borrow record.";
        }

        // Waive the penalty but keep original amount for display
        record.setPenaltyStatus(BorrowRecord.PenaltyStatus.WAIVED);
        // record.setPenaltyType(BorrowRecord.PenaltyType.NONE); // Keep original type for display
        borrowRepo.save(record);

        // Notify user if possible
        userRepo.findById(record.getStudent().getId()).ifPresent(student -> {
            try {
                String to = student.getEmail();
                String subject = "🎉 Penalty Waived - Good News from Library!";
                String studentName = student.getName() != null && !student.getName().trim().isEmpty() ? student.getName() : "Valued Member";
                String bookTitle = record.getBook().getTitle() != null ? record.getBook().getTitle() : "Library Book";
                String bookAuthor = record.getBook().getAuthor() != null ? record.getBook().getAuthor() : "Unknown Author";
                String waivedAmount = "₹" + owed.toPlainString();
                String waiverDate = java.time.format.DateTimeFormatter.ofPattern("MMMM dd, yyyy 'at' HH:mm")
                        .format(java.time.LocalDateTime.now());

                String htmlBody = String.format(
                    """
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Penalty Waived</title>
                        <style>
                            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: #f9f9f9; }
                            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
                            .header { background: linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%); color: white; padding: 30px 20px; text-align: center; }
                            .content { padding: 30px 20px; }
                            .celebration-card { background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%); border-left: 4px solid #9c27b0; padding: 20px; margin: 20px 0; border-radius: 8px; color: #4a148c; text-align: center; }
                            .book-card { background: #f8f9fa; border-left: 4px solid #9c27b0; padding: 15px; margin: 20px 0; border-radius: 8px; }
                            .waiver-summary { background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%); padding: 20px; margin: 20px 0; border-radius: 8px; border: 2px solid #9c27b0; text-align: center; }
                            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; border-top: 1px solid #e9ecef; }
                            h1 { margin: 0; font-size: 28px; }
                            h2 { color: #6a1b9a; margin-top: 0; }
                            h3 { color: #4a148c; margin: 0 0 10px 0; }
                            p { line-height: 1.6; }
                            .highlight { color: #6a1b9a; font-weight: 600; }
                            .waived-amount { font-size: 32px; font-weight: 700; color: #9c27b0; margin: 10px 0; }
                            .celebration-emoji { font-size: 48px; margin-bottom: 15px; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1>🎉 Penalty Waived</h1>
                                <p>Great news from your library!</p>
                            </div>

                            <div class="content">
                                <p>Hello <span class="highlight">%s</span>,</p>

                                <div class="celebration-card">
                                    <div class="celebration-emoji">🎊</div>
                                    <h2>Excellent News!</h2>
                                    <p>Your outstanding penalty has been waived by library administration. You can continue enjoying your library privileges without any restrictions.</p>
                                </div>

                                <div class="waiver-summary">
                                    <h3>💰 Penalty Waiver Details</h3>
                                    <div class="waived-amount">%s</div>
                                    <p><strong>Waiver Date:</strong> %s</p>
                                    <p><strong>Status:</strong> <span style="color: #9c27b0; font-weight: 600;">FULLY WAIVED ✅</span></p>
                                    <p><strong>Decision:</strong> Administrative waiver granted</p>
                                </div>

                                <div class="book-card">
                                    <h2>📖 Related Book Information</h2>
                                    <p><strong>Book Title:</strong> %s</p>
                                    <p><strong>Author:</strong> %s</p>
                                    <p><strong>Penalty Status:</strong> <span style="color: #9c27b0; font-weight: 600;">WAIVED - CLEARED ✅</span></p>
                                </div>

                                <p>This waiver reflects our appreciation for your continued membership and commitment to our library community. We value you as a member and are pleased to provide this courtesy.</p>

                                <p>If you have any questions about this waiver decision or need assistance with any other library matters, please don't hesitate to contact our staff.</p>

                                <p>Thank you for being a valued member of our library community!</p>

                                <p>Best regards,<br>
                                <strong>Library Management System</strong></p>
                            </div>

                            <div class="footer">
                                <p><strong>Library Management System</strong></p>
                                <p>Contact us at support@lms.edu | Visit us at library@lms.edu</p>
                                <p>Waiver processed on %s</p>
                                <p>© 2025 Library Management System. All rights reserved.</p>
                            </div>
                        </div>
                    </body>
                    </html>
                    """,
                    studentName,
                    waivedAmount,
                    waiverDate,
                    bookTitle,
                    bookAuthor,
                    waiverDate
                ).trim();

                emailService.sendEmail(to, subject, htmlBody);
            } catch (Exception ignored) {}
        });

        return "Penalty waived. Amount: " + owed.toString();
    }

    // helper mapper
    private com.infy.lms.dto.PenaltyDTO toPenaltyDto(BorrowRecord r) {
        // Calculate days overdue for display purposes using calendar days
        long daysOverdue = r.daysOverdue();

        return com.infy.lms.dto.PenaltyDTO.builder()
                .borrowRecordId(r.getId())
                .studentId(r.getStudent() == null ? null : r.getStudent().getId())
                .studentName(r.getStudent() == null ? null : r.getStudent().getName())
                .bookId(r.getBook() == null ? null : r.getBook().getId())
                .bookTitle(r.getBook() == null ? null : r.getBook().getTitle())
                .borrowedAt(r.getBorrowedAt())
                .dueDate(r.getDueDate())
                .penaltyAmount(r.getPenaltyAmount())
                .penaltyType(r.getPenaltyType())
                .penaltyStatus(r.getPenaltyStatus())
                .daysOverdue(daysOverdue)
                .build();
    }


    // -----------------------
    // Scheduler / maintenance
    // -----------------------

    @Override
    @Transactional
    public void reconcileOverdues() {
        // Use current time to detect overdue books accurately
        Instant now = Instant.now();
        List<BorrowRecord> overdue = borrowRepo.findOverdue(now);
        for (BorrowRecord rec : overdue) {
            // Get book MRP for penalty calculation
            Book book = rec.getBook();
            BigDecimal mrp = BigDecimal.valueOf(book.getMrp() != null ? book.getMrp().doubleValue() : 0.0);
            BigDecimal penaltyPerDay = mrp.multiply(BigDecimal.valueOf(0.1)).setScale(2, BigDecimal.ROUND_HALF_UP);

            // compute and set penalty (idempotent) - 10% of MRP per day overdue
            long daysLate = rec.daysOverdue();
            BigDecimal totalPenalty = penaltyPerDay.multiply(BigDecimal.valueOf(daysLate)).setScale(2, BigDecimal.ROUND_HALF_UP);
            rec.setPenaltyAmount(daysLate > 0 ? totalPenalty : BigDecimal.ZERO);
            rec.setPenaltyType(daysLate > 0 ? BorrowRecord.PenaltyType.LATE : BorrowRecord.PenaltyType.NONE);
            rec.setPenaltyStatus(totalPenalty.compareTo(BigDecimal.ZERO) > 0 ? BorrowRecord.PenaltyStatus.PENDING : BorrowRecord.PenaltyStatus.NONE);
            rec.setStatus(BorrowStatus.OVERDUE);
            borrowRepo.save(rec);
        }
    }

    @Override
    @Transactional
    public void sendDueDateAlerts() {
        // Calculate the date 2 days from now (start and end of that day)
        Instant now = Instant.now();
        Instant twoDaysFromNow = now.plus(Duration.ofDays(2));
        Instant startOfDay = twoDaysFromNow.truncatedTo(ChronoUnit.DAYS);
        Instant endOfDay = startOfDay.plus(Duration.ofDays(1)).minus(Duration.ofNanos(1));

        System.out.println("🔍 DUE DATE ALERTS: Checking for books due between " + startOfDay + " and " + endOfDay);

        // Find all active borrows (not returned) due in exactly 2 days
        List<BorrowRecord> dueInTwoDays = borrowRepo.findAll().stream()
                .filter(record -> record.getReturnedAt() == null) // Not yet returned
                .filter(record -> {
                    Instant dueDate = record.getDueDate();
                    return dueDate != null && dueDate.isAfter(startOfDay) && dueDate.isBefore(endOfDay);
                })
                .collect(Collectors.toList());

        System.out.println("📋 DUE DATE ALERTS: Found " + dueInTwoDays.size() + " books due in 2 days");

        // Send email alerts to each student
        for (BorrowRecord record : dueInTwoDays) {
            try {
                User student = record.getStudent();
                Book book = record.getBook();

                if (student != null && student.getEmail() != null && book != null) {
                    String studentName = student.getName() != null ? student.getName() : "Valued Student";
                    String bookTitle = book.getTitle() != null ? book.getTitle() : "Library Book";
                    String dueDateStr = java.time.format.DateTimeFormatter.ofPattern("MMMM dd, yyyy")
                            .format(java.time.LocalDateTime.ofInstant(record.getDueDate(), java.time.ZoneId.systemDefault()));

                    String subject = "📚 Book Due Reminder - " + bookTitle;
                    String htmlBody = String.format(
                        """
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>Book Due Reminder</title>
                            <style>
                                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: #f9f9f9; }
                                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
                                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
                                .content { padding: 30px 20px; }
                                .book-card { background: #f8f9fa; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 8px; }
                                .warning-card { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 8px; color: #856404; }
                                .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; border-top: 1px solid #e9ecef; }
                                h1 { margin: 0; font-size: 28px; }
                                h2 { color: #667eea; margin-top: 0; }
                                h3 { color: #856404; margin: 0 0 10px 0; }
                                p { line-height: 1.6; }
                                .highlight { color: #667eea; font-weight: 600; }
                                .due-date { font-size: 18px; font-weight: 700; color: #dc3545; margin: 10px 0; }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <div class="header">
                                    <h1>📚 Due Date Reminder</h1>
                                    <p>Please return your book on time</p>
                                </div>

                                <div class="content">
                                    <p>Hello <span class="highlight">%s</span>,</p>

                                    <p>This is a friendly reminder that one of your borrowed books is due for return in <strong>2 days</strong>.</p>

                                    <div class="book-card">
                                        <h2>📖 Book Details</h2>
                                        <p><strong>Book Title:</strong> %s</p>
                                        <p><strong>Author:</strong> %s</p>
                                        <p><strong>Due Date:</strong></p>
                                        <div class="due-date">%s</div>
                                    </div>

                                    <div class="warning-card">
                                        <h2>⚠️ Important Notice</h2>
                                        <p>Please return this book by the due date to avoid late fees. Late fees are calculated at 10%% of the book's MRP per day overdue.</p>
                                        <p>If you need more time, please contact the library staff to extend your loan period.</p>
                                    </div>

                                    <p>You can return the book through your student dashboard or by visiting the library in person.</p>

                                    <p>Thank you for using our library services!</p>

                                    <p>Best regards,<br>
                                    <strong>Library Management System</strong></p>
                                </div>

                                <div class="footer">
                                    <p><strong>Library Management System</strong></p>
                                    <p>This is an automated reminder • Do not reply to this email</p>
                                    <p>© 2025 Library Management System. All rights reserved.</p>
                                </div>
                            </div>
                        </body>
                        </html>
                        """,
                        studentName,
                        bookTitle,
                        book.getAuthor() != null ? book.getAuthor() : "Unknown Author",
                        dueDateStr
                    ).trim();

                    emailService.sendEmail(student.getEmail(), subject, htmlBody);
                    System.out.println("✅ DUE DATE ALERT: Sent reminder to " + student.getEmail() + " for book '" + bookTitle + "' due on " + dueDateStr);
                }
            } catch (Exception ex) {
                System.out.println("❌ DUE DATE ALERT: Failed to send alert for borrow record " + record.getId() + ": " + ex.getMessage());
            }
        }

        System.out.println("✅ DUE DATE ALERTS: Completed sending " + dueInTwoDays.size() + " reminders");
    }

    @Override
    @Transactional
    public void sendLowStockAlerts() {
        System.out.println("🔍 LOW STOCK ALERTS: Checking for books with low stock (≤2 available copies)");

        // Find all books with 2 or fewer available copies
        List<Book> lowStockBooks = bookRepo.findAll().stream()
                .filter(book -> {
                    Integer available = book.getAvailableCopies();
                    return available != null && available <= 2;
                })
                .collect(Collectors.toList());

        System.out.println("📋 LOW STOCK ALERTS: Found " + lowStockBooks.size() + " books with low stock");

        if (lowStockBooks.isEmpty()) {
            System.out.println("✅ LOW STOCK ALERTS: No books with low stock, skipping alerts");
            return;
        }

        // Find all admin and librarian users to send alerts to
        List<User> adminUsers = userRepo.findAll().stream()
                .filter(user -> {
                    Role role = user.getRole();
                    return role == Role.ADMIN || role == Role.LIBRARIAN;
                })
                .collect(Collectors.toList());

        System.out.println("👥 LOW STOCK ALERTS: Found " + adminUsers.size() + " admin/librarian users to notify");

        // Send email alerts to each admin
        for (User admin : adminUsers) {
            try {
                if (admin.getEmail() != null) {
                    String adminName = admin.getName() != null ? admin.getName() : "Administrator";
                    String subject = "📚 Low Stock Alert - Books Need Restocking";

                    // Build the email content with list of low-stock books
                    StringBuilder bookList = new StringBuilder();
                    for (Book book : lowStockBooks) {
                        bookList.append(String.format(
                            "• <strong>%s</strong> by %s<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Available: %d copies<br>",
                            book.getTitle() != null ? book.getTitle() : "Unknown Title",
                            book.getAuthor() != null ? book.getAuthor() : "Unknown Author",
                            book.getAvailableCopies() != null ? book.getAvailableCopies() : 0
                        ));
                    }

                    String htmlBody = String.format(
                        """
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>Low Stock Alert</title>
                            <style>
                                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: #f9f9f9; }
                                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
                                .header { background: linear-gradient(135deg, #dc3545 0%, #b02a37 100%); color: white; padding: 30px 20px; text-align: center; }
                                .content { padding: 30px 20px; }
                                .book-list { background: #f8f9fa; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; border-radius: 8px; }
                                .warning-card { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 8px; color: #856404; }
                                .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; border-top: 1px solid #e9ecef; }
                                h1 { margin: 0; font-size: 28px; }
                                h2 { color: #dc3545; margin-top: 0; }
                                h3 { color: #856404; margin: 0 0 10px 0; }
                                p { line-height: 1.6; }
                                .highlight { color: #dc3545; font-weight: 600; }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <div class="header">
                                    <h1>📚 Low Stock Alert</h1>
                                    <p>Books need restocking</p>
                                </div>

                                <div class="content">
                                    <p>Hello <span class="highlight">%s</span>,</p>

                                    <p>This alert notifies you that the following books have low stock (2 or fewer available copies) and may need restocking:</p>

                                    <div class="book-list">
                                        <h2>📖 Books with Low Stock</h2>
                                        %s
                                    </div>

                                    <div class="warning-card">
                                        <h2>⚠️ Action Required</h2>
                                        <p>Please review the inventory and consider ordering more copies of these books to ensure availability for students.</p>
                                        <p>Books with low stock may become unavailable for borrowing, affecting student access to library resources.</p>
                                    </div>

                                    <p>You can manage book inventory through the admin dashboard under the Books section.</p>

                                    <p>Best regards,<br>
                                    <strong>Library Management System</strong></p>
                                </div>

                                <div class="footer">
                                    <p><strong>Library Management System</strong></p>
                                    <p>This is an automated alert • Generated on %s</p>
                                    <p>© 2025 Library Management System. All rights reserved.</p>
                                </div>
                            </div>
                        </body>
                        </html>
                        """,
                        adminName,
                        bookList.toString(),
                        java.time.format.DateTimeFormatter.ofPattern("MMMM dd, yyyy 'at' HH:mm")
                            .format(java.time.LocalDateTime.now())
                    ).trim();

                    emailService.sendEmail(admin.getEmail(), subject, htmlBody);
                    System.out.println("✅ LOW STOCK ALERT: Sent alert to " + admin.getEmail() + " about " + lowStockBooks.size() + " low-stock books");
                }
            } catch (Exception ex) {
                System.out.println("❌ LOW STOCK ALERT: Failed to send alert to admin " + admin.getId() + ": " + ex.getMessage());
            }
        }

        System.out.println("✅ LOW STOCK ALERTS: Completed sending alerts to " + adminUsers.size() + " administrators");
    }

    // -----------------------
    // Helpers
    // -----------------------

    private BorrowHistoryDTO toHistoryDto(BorrowRecord r) {
        return BorrowHistoryDTO.builder()
                .id(r.getId())
                .studentId(r.getStudent() == null ? null : r.getStudent().getId())
                .studentName(r.getStudent() == null ? null : r.getStudent().getName())
                .bookId(r.getBook() == null ? null : r.getBook().getId())
                .bookTitle(r.getBook() == null ? null : r.getBook().getTitle())
                .bookAuthor(r.getBook() == null ? null : r.getBook().getAuthor())
                .bookMrp(r.getBook() == null ? null : r.getBook().getMrp())
                .bookGenre(r.getBook() == null ? null : r.getBook().getGenre())
                .bookPublisher(r.getBook() == null ? null : r.getBook().getPublisher())
                .bookIsbn(r.getBook() == null ? null : r.getBook().getIsbn())
                .bookCategory(r.getBook() == null ? null : r.getBook().getGenre())
                .bookDescription(null) // Description not directly available in Book entity
                .borrowedAt(r.getBorrowedAt())
                .dueDate(r.getDueDate())
                .returnedAt(r.getReturnedAt())
                .status(r.getStatus() == null ? null : r.getStatus().name())
                .isOverdue(r.isOverdue())
                .penaltyAmount(r.getPenaltyAmount() == null ? BigDecimal.ZERO : r.getPenaltyAmount())
                .penaltyType(r.getPenaltyType() == null ? null : r.getPenaltyType().name())
                .penaltyStatus(r.getPenaltyStatus() == null ? null : r.getPenaltyStatus().name())
                .build();
    }


    private void notifyReturn(BorrowRecord record) {
        try {
            userRepo.findById(record.getStudent().getId()).ifPresent(student -> {
                try {
                    String to = student.getEmail();
                    String subject = "Book Return Confirmation - " + record.getBook().getTitle();
                    String studentName = student.getName() != null && !student.getName().trim().isEmpty() ? student.getName() : "Valued Member";

                    // Format dates
                    String returnDateStr = record.getReturnedAt() != null
                        ? java.time.format.DateTimeFormatter.ofPattern("MMMM dd, yyyy")
                            .format(java.time.LocalDateTime.ofInstant(record.getReturnedAt(), java.time.ZoneId.systemDefault()))
                        : "Not specified";

                    String dueDateStr = record.getDueDate() != null
                        ? java.time.format.DateTimeFormatter.ofPattern("MMMM dd, yyyy")
                            .format(java.time.LocalDateTime.ofInstant(record.getDueDate(), java.time.ZoneId.systemDefault()))
                        : "Not specified";

                    String penaltyTypeStr = record.getPenaltyType() != null ? record.getPenaltyType().toString() : "None";
                    String penaltyAmountStr = record.getPenaltyAmount() != null && record.getPenaltyAmount().compareTo(java.math.BigDecimal.ZERO) > 0
                        ? "₹" + record.getPenaltyAmount().toPlainString()
                        : "₹0.00";

                    // Create status-specific messaging
                    String statusColor = "#28a745"; // Green for normal returns
                    String statusMessage = "Thank you for returning the book on time!";
                    String description = "";

                    if (BorrowRecord.PenaltyType.LATE == record.getPenaltyType()) {
                        statusColor = "#ffc107"; // Yellow for late
                        statusMessage = "Your book was returned late, nice to have it back!";
                        description = "Late fees are calculated at 10% of the book's MRP per day overdue.";
                    } else if (BorrowRecord.PenaltyType.DAMAGE == record.getPenaltyType()) {
                        statusColor = "#fd7e14"; // Orange for damage
                        statusMessage = "Your book has been noted as damaged.";
                        description = "Damage charges are equivalent to the book's full MRP as per library policy.";
                    } else if (BorrowRecord.PenaltyType.LOST == record.getPenaltyType()) {
                        statusColor = "#dc3545"; // Red for lost
                        statusMessage = "Your book has been marked as lost.";
                        description = "Lost books require full replacement cost equivalent to the book's MRP.";
                    }

                    String htmlBody = String.format(
                        """
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>Book Return Confirmation</title>
                            <style>
                                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: #f9f9f9; }
                                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
                                .header { background: linear-gradient(135deg, %s, %s); color: white; padding: 30px 20px; text-align: center; }
                                .content { padding: 30px 20px; }
                                .book-card { background: #f8f9fa; border-left: 4px solid %s; padding: 15px; margin: 20px 0; border-radius: 8px; }
                                .penalty-card { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 8px; color: #856404; }
                                .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; border-top: 1px solid #e9ecef; }
                                h1 { margin: 0; font-size: 28px; }
                                h2 { color: %s; margin-top: 0; }
                                h3 { color: #856404; margin: 0 0 10px 0; }
                                p { line-height: 1.6; }
                                .highlight { color: %s; font-weight: 600; }
                                .penalty-amount { font-size: 24px; font-weight: 700; color: #dc3545; margin: 10px 0; }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <div class="header">
                                    <h1>📚 Return Confirmed</h1>
                                    <p>Thank you for using our library</p>
                                </div>

                                <div class="content">
                                    <p>Hello <span class="highlight">%s</span>,</p>

                                    <p>%s</p>

                                    <div class="book-card">
                                        <h2>📖 Returned Book Details</h2>
                                        <p><strong>Book Title:</strong> %s</p>
                                        <p><strong>Author:</strong> %s</p>
                                        <p><strong>Due Date:</strong> %s</p>
                                        <p><strong>Return Date:</strong> %s</p>
                                        <p><strong>Return Status:</strong> <span style="color: %s; font-weight: 600;">%s</span></p>
                                    </div>

                                    <div class="penalty-card">
                                        <h2>💰 Penalty Information</h2>
                                        <p><strong>Penalty Type:</strong> %s</p>
                                        <div class="penalty-amount">%s</div>
                                        <p>%s</p>
                                        %s
                                    </div>

                                    <p>If you have any questions about this return or the penalty assessment, please contact our library staff right away.</p>

                                    <p>We hope to see you again soon and continue your reading journey with us!</p>

                                    <p>Best regards,<br>
                                    <strong>Library Management System</strong></p>
                                </div>

                                <div class="footer">
                                    <p><strong>Library Management System</strong></p>
                                    <p>Contact us at support@lms.edu | Visit us at library@lms.edu</p>
                                    <p>© 2025 Library Management System. All rights reserved.</p>
                                </div>
                            </div>
                        </body>
                        </html>
                        """,
                        statusColor, statusColor, // Header gradient
                        statusColor, // Book card border
                        statusColor, // H2 color
                        statusColor, // Highlight color
                        studentName,
                        statusMessage,
                        record.getBook().getTitle() != null ? record.getBook().getTitle() : "Unknown Book",
                        record.getBook().getAuthor() != null ? record.getBook().getAuthor() : "Unknown Author",
                        dueDateStr,
                        returnDateStr,
                        statusColor,
                        record.getStatus() != null ? record.getStatus().toString() : "UNKNOWN",
                        penaltyTypeStr,
                        penaltyAmountStr,
                        description,
                        penaltyAmountStr.equals("₹0.00") ? "<p style='color: #28a745; font-weight: 600;'>No penalty applied! 🎉</p>" : "<p>If you'd like to pay this penalty now, please visit the library or contact library staff.</p>"
                    ).trim();

                    emailService.sendEmail(to, subject, htmlBody);
                } catch (Exception ignored) {}
            });
        } catch (Exception ignored) {}
    }
}
