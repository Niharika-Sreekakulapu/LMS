package com.infy.lms.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import com.infy.lms.enums.BorrowStatus;

@Entity
@Table(name = "borrow_records")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BorrowRecord {

    public enum PenaltyType { NONE, LATE, DAMAGE, LOST }
    public enum PenaltyStatus { NONE, PENDING, PAID, WAIVED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "book_id", nullable = false)
    private Book book;

    @Column(name = "borrowed_at", nullable = false, updatable = false)
    private Instant borrowedAt;

    @Column(name = "due_date", nullable = false)
    private Instant dueDate;

    @Column(name = "returned_at")
    private Instant returnedAt;

    @Column(name = "fine_amount", precision = 10, scale = 2, nullable = false)
    private BigDecimal penaltyAmount = BigDecimal.ZERO;


    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BorrowStatus status;


    @Enumerated(EnumType.STRING)
    @Column(name = "penalty_type", nullable = false)
    private PenaltyType penaltyType = PenaltyType.NONE;

    @Enumerated(EnumType.STRING)
    @Column(name = "penalty_status", nullable = false, length = 10)
    private PenaltyStatus penaltyStatus = PenaltyStatus.NONE;

    @Column(name = "student_reported_damaged")
    private boolean studentReportedDamaged = false;

    @Column(name = "student_reported_lost")
    private boolean studentReportedLost = false;

    @PrePersist
    protected void onCreate() {
        if (this.borrowedAt == null) {
            this.borrowedAt = Instant.now();
        }
    }

    public boolean isOverdue() {
        if (this.returnedAt != null || this.dueDate == null) return false;
        LocalDate dueLocalDate = this.dueDate.atZone(ZoneId.systemDefault()).toLocalDate();
        LocalDate nowLocalDate = Instant.now().atZone(ZoneId.systemDefault()).toLocalDate();
        return nowLocalDate.isAfter(dueLocalDate);
    }

    public long daysOverdue() {
        if (!isOverdue()) return 0;
        LocalDate dueLocalDate = this.dueDate.atZone(ZoneId.systemDefault()).toLocalDate();
        LocalDate nowLocalDate = Instant.now().atZone(ZoneId.systemDefault()).toLocalDate();
        return ChronoUnit.DAYS.between(dueLocalDate, nowLocalDate);
    }

    public BigDecimal computeAndSetLatePenalty(double bookMrp) {
        long days = daysOverdue();
        if (days <= 0) {
            this.penaltyAmount = BigDecimal.ZERO;
            this.penaltyType = PenaltyType.NONE;
            this.penaltyStatus = PenaltyStatus.NONE;
            return this.penaltyAmount;
        }
        // Late penalty is 10% of MRP per day overdue
        BigDecimal mrp = BigDecimal.valueOf(bookMrp);
        BigDecimal penaltyPerDay = mrp.multiply(BigDecimal.valueOf(0.1)).setScale(2, BigDecimal.ROUND_HALF_UP);
        BigDecimal totalPenalty = penaltyPerDay.multiply(BigDecimal.valueOf(days)).setScale(2, BigDecimal.ROUND_HALF_UP);
        this.penaltyAmount = totalPenalty;
        this.penaltyType = PenaltyType.LATE;
        if (totalPenalty.compareTo(BigDecimal.ZERO) > 0) {
            this.penaltyStatus = PenaltyStatus.PENDING;
        }
        return totalPenalty;
    }

    public void markReturnedNow(double bookMrp) {
        this.returnedAt = Instant.now();
        computeAndSetLatePenalty(bookMrp);
        this.status = BorrowStatus.RETURNED;
    }
}
