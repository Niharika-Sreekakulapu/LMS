package com.infy.lms.service;

import com.infy.lms.dto.BookReservationDto;
import com.infy.lms.dto.BookWaitlistDto;
import com.infy.lms.dto.BorrowRequestDTO;
import com.infy.lms.enums.BorrowStatus;
import com.infy.lms.model.*;
import com.infy.lms.repository.BookReservationRepository;
import com.infy.lms.repository.BookWaitlistRepository;
import com.infy.lms.repository.BorrowRecordRepository;
import com.infy.lms.service.BorrowService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WaitlistService {

    private final BookWaitlistRepository waitlistRepository;
    private final BookReservationRepository reservationRepository;
    private final BorrowRecordRepository borrowRecordRepository;

    // Priority calculation constants (configurable via admin settings later)
    private static final BigDecimal WAITING_TIME_WEIGHT = new BigDecimal("1.0");
    private static final BigDecimal COURSE_URGENCY_WEIGHT = new BigDecimal("15.0");
    private static final BigDecimal LATE_RETURN_PENALTY = new BigDecimal("-5.0");
    private static final BigDecimal MEMBERSHIP_BONUS = new BigDecimal("8.0");

    /**
     * Join the waitlist for an unavailable book
     */
    @Transactional
    public BookWaitlistDto joinWaitlist(User student, Book book) {
        System.out.println("🔍 WAITLIST JOIN: Starting joinWaitlist for student '" + student.getName() + "' and book '" + book.getTitle() + "'");

        // Check if already in active waitlist
        Optional<BookWaitlist> existingActive = waitlistRepository.findByStudentAndBookAndIsActiveTrue(student, book);
        if (existingActive.isPresent()) {
            System.out.println("❌ WAITLIST JOIN: Student is already in active waitlist for this book");
            throw new RuntimeException("Student is already in the waitlist for this book");
        }

        // Check if there's an inactive entry for this student-book combination
        // If so, we should reactivate it instead of creating a new one
        List<BookWaitlist> allEntriesForStudentBook = waitlistRepository.findByStudentAndBook(student, book);
        Optional<BookWaitlist> inactiveEntry = allEntriesForStudentBook.stream()
                .filter(entry -> !entry.getIsActive())
                .findFirst();

        if (inactiveEntry.isPresent()) {
            // Reactivate the existing entry
            BookWaitlist entry = inactiveEntry.get();
            entry.setIsActive(true);
            entry.setJoinedAt(Instant.now()); // Reset join time
            calculateAndUpdatePriority(entry);

            System.out.println("🔄 WAITLIST JOIN: Reactivating existing waitlist entry");

            BookWaitlist saved = waitlistRepository.save(entry);
            updateQueuePositions(book);

            System.out.println("✅ WAITLIST JOIN: Successfully reactivated waitlist entry with ID " + saved.getId());
            return convertToDto(saved);
        }

        System.out.println("✅ WAITLIST JOIN: Creating new waitlist entry");

        // Create new waitlist entry
        BookWaitlist waitlistEntry = BookWaitlist.builder()
                .student(student)
                .book(book)
                .joinedAt(Instant.now())
                .isActive(true)
                .build();

        // Calculate initial priority
        calculateAndUpdatePriority(waitlistEntry);

        System.out.println("💾 WAITLIST JOIN: Saving waitlist entry");

        // Save and update queue positions
        BookWaitlist saved = waitlistRepository.save(waitlistEntry);
        updateQueuePositions(book);

        System.out.println("✅ WAITLIST JOIN: Successfully joined waitlist with ID " + saved.getId());

        return convertToDto(saved);
    }

    /**
     * Get all active waitlists grouped by book (admin/librarian view)
     */
    public java.util.Map<Long, List<BookWaitlistDto>> getAllActiveWaitlists() {
        List<BookWaitlist> allEntries = waitlistRepository.findByIsActiveTrue();
        return allEntries.stream()
                .collect(Collectors.groupingBy(
                        entry -> entry.getBook().getId(),
                        Collectors.mapping(this::convertToDto, Collectors.toList())
                ));
    }

    /**
     * Get waitlist position and details for a student-book combination
     */
    public BookWaitlistDto getWaitlistPosition(User student, Book book) {
        Optional<BookWaitlist> waitlistEntry = waitlistRepository.findByStudentAndBookAndIsActiveTrue(student, book);
        return waitlistEntry.map(this::convertToDto).orElse(null);
    }

    /**
     * Get all waitlist entries for a student
     */
    public List<BookWaitlistDto> getStudentWaitlist(User student) {
        List<BookWaitlist> entries = waitlistRepository.findByStudentAndIsActiveTrue(student);
        return entries.stream().map(this::convertToDto).collect(Collectors.toList());
    }

    /**
     * Get waitlist for a book (admin/librarian view)
     */
    public List<BookWaitlistDto> getBookWaitlist(Book book) {
        List<BookWaitlist> entries = waitlistRepository.findActiveWaitlistForBook(book);
        return entries.stream().map(this::convertToDto).collect(Collectors.toList());
    }

    /**
     * Leave the waitlist
     */
    @Transactional
    public void leaveWaitlist(User student, Book book) {
        Optional<BookWaitlist> waitlistEntry = waitlistRepository.findByStudentAndBookAndIsActiveTrue(student, book);
        if (waitlistEntry.isPresent()) {
            BookWaitlist entry = waitlistEntry.get();
            entry.setIsActive(false);
            waitlistRepository.save(entry);
            updateQueuePositions(book);
        }
    }

    /**
     * Handle book return - immediately issue to highest priority student
     */
    @Transactional
    public User handleBookReturn(Book book) {
        // Find highest priority student in waitlist
        List<BookWaitlist> waitlist = waitlistRepository.findActiveWaitlistForBook(book);

        if (!waitlist.isEmpty()) {
            BookWaitlist highestPriority = waitlist.get(0);
            User student = highestPriority.getStudent();

            // Remove student from waitlist (they will get the book issued)
            highestPriority.setIsActive(false);
            waitlistRepository.save(highestPriority);

            // Update queue positions for remaining students
            updateQueuePositions(book);

            System.out.println("✅ WAITLIST ALLOCATION: Book '" + book.getTitle() +
                             "' will be issued to student '" + student.getName() + "' from waitlist");

            return student; // Return the student who should get the book
        }

        return null; // No one in waitlist
    }

    /**
     * Convert reservation to borrow (when student collects the book)
     */
    @Transactional
    public void convertReservationToBorrow(BookReservation reservation, User librarian) {
        if (reservation.isActive()) {
            // Mark reservation as converted
            reservation.convertToBorrow();
            reservationRepository.save(reservation);

            // Create borrow record (this would normally be done by the existing borrow service)
            // For now, we'll just mark the reservation
        }
    }

    /**
     * Clean up expired reservations
     */
    @Transactional
    public void cleanupExpiredReservations() {
        List<BookReservation> expiredReservations = reservationRepository.findExpiredReservations(
                BookReservation.ReservationStatus.ACTIVE, Instant.now());

        for (BookReservation reservation : expiredReservations) {
            reservation.expire();
            reservationRepository.save(reservation);

            // Re-queue the book for the next student
            handleBookReturn(reservation.getBook());
        }
    }

    /**
     * Calculate and update priority score for a waitlist entry
     */
    private void calculateAndUpdatePriority(BookWaitlist waitlistEntry) {
        User student = waitlistEntry.getStudent();

        // Update waiting days
        waitlistEntry.updateWaitingDays();

        // Calculate priority components
        BigDecimal waitingScore = WAITING_TIME_WEIGHT.multiply(BigDecimal.valueOf(waitlistEntry.getWaitingDays()));

        // Course urgency bonus (simplified - would need course/year info)
        BigDecimal courseUrgency = calculateCourseUrgencyBonus(student);

        // Late return penalty
        BigDecimal latePenalty = calculateLateReturnPenalty(student);

        // Membership bonus
        BigDecimal membershipBonus = calculateMembershipBonus(student);

        // Total priority score
        BigDecimal totalScore = waitingScore
                .add(courseUrgency)
                .add(latePenalty)
                .add(membershipBonus);

        // Update the entry
        waitlistEntry.setPriorityScore(totalScore);
        waitlistEntry.setCourseUrgencyBonus(courseUrgency);
        waitlistEntry.setLateReturnPenalty(latePenalty);
        waitlistEntry.setMembershipBonus(membershipBonus);
        waitlistEntry.setLastUpdated(Instant.now());
    }

    /**
     * Calculate course urgency bonus (would need student profile/course data)
     */
    private BigDecimal calculateCourseUrgencyBonus(User student) {
        // Simplified logic - in real implementation, this would check:
        // - Student year (final year = higher priority)
        // - Course type (core subjects = higher priority)
        // - Assignment deadlines, exam schedules, etc.

        // For now, give basic bonus based on role or other criteria
        if (student.getRole() != null && student.getRole().toString().contains("PREMIUM")) {
            return COURSE_URGENCY_WEIGHT.multiply(new BigDecimal("0.5"));
        }

        return BigDecimal.ZERO;
    }

    /**
     * Calculate late return penalty
     */
    private BigDecimal calculateLateReturnPenalty(User student) {
        // Count recent late returns
        List<BorrowRecord> recentBorrows = borrowRecordRepository.findByStudent(student);

        long lateReturns = recentBorrows.stream()
                .filter(record -> record.getReturnedAt() != null &&
                        record.getReturnedAt().isAfter(record.getDueDate()))
                .count();

        // Penalty increases with more late returns
        return LATE_RETURN_PENALTY.multiply(BigDecimal.valueOf(Math.min(lateReturns, 5)));
    }

    /**
     * Calculate membership bonus
     */
    private BigDecimal calculateMembershipBonus(User student) {
        // Premium members get priority bonus
        if (student.getRole() != null && student.getRole().toString().contains("PREMIUM")) {
            return MEMBERSHIP_BONUS;
        }

        return BigDecimal.ZERO;
    }

    /**
     * Update queue positions for all active waitlist entries of a book
     */
    private void updateQueuePositions(Book book) {
        List<BookWaitlist> waitlist = waitlistRepository.findActiveWaitlistForBook(book);

        for (int i = 0; i < waitlist.size(); i++) {
            BookWaitlist entry = waitlist.get(i);
            entry.setQueuePosition(i + 1);

            // Estimate wait time based on position and average borrow duration
            int estimatedDays = (i + 1) * 7; // Rough estimate: 7 days per person ahead
            entry.setEstimatedWaitDays(estimatedDays);

            waitlistRepository.save(entry);
        }
    }

    /**
     * Convert BookWaitlist entity to DTO
     */
    private BookWaitlistDto convertToDto(BookWaitlist waitlist) {
        String priorityReason = buildPriorityReason(waitlist);
        String estimatedDate = calculateEstimatedDate(waitlist.getEstimatedWaitDays());

        return BookWaitlistDto.builder()
                .id(waitlist.getId())
                .bookId(waitlist.getBook().getId())
                .bookTitle(waitlist.getBook().getTitle())
                .bookAuthor(waitlist.getBook().getAuthor())
                .studentId(waitlist.getStudent().getId())
                .studentName(waitlist.getStudent().getName())
                .studentEmail(waitlist.getStudent().getEmail())
                .joinedAt(waitlist.getJoinedAt())
                .priorityScore(waitlist.getPriorityScore())
                .queuePosition(waitlist.getQueuePosition())
                .estimatedWaitDays(waitlist.getEstimatedWaitDays())
                .waitingDays(waitlist.getWaitingDays())
                .courseUrgencyBonus(waitlist.getCourseUrgencyBonus())
                .lateReturnPenalty(waitlist.getLateReturnPenalty())
                .membershipBonus(waitlist.getMembershipBonus())
                .isActive(waitlist.getIsActive())
                .priorityReason(priorityReason)
                .estimatedAvailableDate(estimatedDate)
                .build();
    }

    private String buildPriorityReason(BookWaitlist waitlist) {
        StringBuilder reason = new StringBuilder();

        if (waitlist.getCourseUrgencyBonus().compareTo(BigDecimal.ZERO) > 0) {
            reason.append("Course urgency bonus (+").append(waitlist.getCourseUrgencyBonus()).append(")");
        }

        if (waitlist.getWaitingDays() > 0) {
            if (reason.length() > 0) reason.append(", ");
            reason.append("Waiting ").append(waitlist.getWaitingDays()).append(" days (+")
                    .append(WAITING_TIME_WEIGHT.multiply(BigDecimal.valueOf(waitlist.getWaitingDays()))).append(")");
        }

        if (waitlist.getMembershipBonus().compareTo(BigDecimal.ZERO) > 0) {
            if (reason.length() > 0) reason.append(", ");
            reason.append("Premium member (+").append(waitlist.getMembershipBonus()).append(")");
        }

        if (waitlist.getLateReturnPenalty().compareTo(BigDecimal.ZERO) < 0) {
            if (reason.length() > 0) reason.append(", ");
            reason.append("Late return penalty (").append(waitlist.getLateReturnPenalty()).append(")");
        }

        return reason.length() > 0 ? reason.toString() : "Standard priority";
    }

    private String calculateEstimatedDate(Integer estimatedWaitDays) {
        if (estimatedWaitDays == null || estimatedWaitDays <= 0) {
            return "Available soon";
        }

        Instant estimatedDate = Instant.now().plus(estimatedWaitDays, ChronoUnit.DAYS);
        return estimatedDate.toString().substring(0, 10); // YYYY-MM-DD format
    }
}
