package com.infy.lms.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
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
    @Column(name = "penalty_status", nullable = false)
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
        return this.returnedAt == null && this.dueDate != null && Instant.now().isAfter(this.dueDate);
    }

    public long daysOverdue() {
        if (!isOverdue()) return 0;
        return ChronoUnit.DAYS.between(this.dueDate.truncatedTo(ChronoUnit.DAYS), Instant.now().truncatedTo(ChronoUnit.DAYS));
    }

    public BigDecimal computeAndSetLatePenalty(double bookMrp) {
        long days = daysOverdue();
        if (days <= 0) {
            this.penaltyAmount = BigDecimal.ZERO;
            this.penaltyType = PenaltyType.NONE;
            this.penaltyStatus = PenaltyStatus.NONE;
            return this.penaltyAmount;
        }
        // Late penalty is 10% of MRP if overdue
        BigDecimal mrp = BigDecimal.valueOf(bookMrp);
        BigDecimal penalty = mrp.multiply(BigDecimal.valueOf(0.1)).setScale(2, BigDecimal.ROUND_HALF_UP);
        this.penaltyAmount = penalty;
        this.penaltyType = PenaltyType.LATE;
        if (penalty.compareTo(BigDecimal.ZERO) > 0) {
            this.penaltyStatus = PenaltyStatus.PENDING;
        }
        return penalty;
    }

    public void markReturnedNow(double finePerDay) {
        this.returnedAt = Instant.now();
        computeAndSetLatePenalty(finePerDay);
        this.status = BorrowStatus.RETURNED;
    }
}
