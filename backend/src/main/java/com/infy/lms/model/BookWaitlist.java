package com.infy.lms.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "book_waitlist",
       uniqueConstraints = @UniqueConstraint(columnNames = {"student_id", "book_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookWaitlist {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "book_id", nullable = false)
    private Book book;

    @Column(name = "joined_at", nullable = false, updatable = false)
    private Instant joinedAt;

    @Column(name = "priority_score", precision = 10, scale = 2, nullable = false)
    private BigDecimal priorityScore;

    @Column(name = "queue_position")
    private Integer queuePosition;

    @Column(name = "estimated_wait_days")
    private Integer estimatedWaitDays;

    // Priority factors
    @Column(name = "waiting_days", nullable = false)
    private Integer waitingDays = 0;

    @Column(name = "course_urgency_bonus", precision = 5, scale = 2, nullable = false)
    private BigDecimal courseUrgencyBonus = BigDecimal.ZERO;

    @Column(name = "late_return_penalty", precision = 5, scale = 2, nullable = false)
    private BigDecimal lateReturnPenalty = BigDecimal.ZERO;

    @Column(name = "membership_bonus", precision = 5, scale = 2, nullable = false)
    private BigDecimal membershipBonus = BigDecimal.ZERO;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "last_updated")
    private Instant lastUpdated;

    @PrePersist
    protected void onCreate() {
        if (this.joinedAt == null) {
            this.joinedAt = Instant.now();
        }
        if (this.lastUpdated == null) {
            this.lastUpdated = Instant.now();
        }
        if (this.priorityScore == null) {
            this.priorityScore = BigDecimal.ZERO;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.lastUpdated = Instant.now();
    }

    public void updateWaitingDays() {
        if (this.joinedAt != null) {
            this.waitingDays = (int) java.time.Duration.between(this.joinedAt, Instant.now()).toDays();
        }
    }
}
