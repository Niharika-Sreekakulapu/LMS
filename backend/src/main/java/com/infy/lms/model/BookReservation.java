package com.infy.lms.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "book_reservations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookReservation {

    public enum ReservationStatus { ACTIVE, EXPIRED, CANCELLED, CONVERTED_TO_BORROW }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "book_id", nullable = false)
    private Book book;

    @Column(name = "reserved_at", nullable = false, updatable = false)
    private Instant reservedAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReservationStatus status = ReservationStatus.ACTIVE;

    @Column(name = "notification_sent", nullable = false)
    private Boolean notificationSent = false;

    @Column(name = "collected_at")
    private Instant collectedAt;

    @Column(name = "converted_to_borrow", nullable = false)
    private Boolean convertedToBorrow = false;

    @PrePersist
    protected void onCreate() {
        if (this.reservedAt == null) {
            this.reservedAt = Instant.now();
        }
        if (this.expiresAt == null) {
            // Default 24 hours expiration
            this.expiresAt = Instant.now().plusSeconds(24 * 60 * 60);
        }
    }

    public boolean isExpired() {
        return this.status == ReservationStatus.ACTIVE && Instant.now().isAfter(this.expiresAt);
    }

    public boolean isActive() {
        return this.status == ReservationStatus.ACTIVE && !isExpired();
    }

    public void expire() {
        this.status = ReservationStatus.EXPIRED;
    }

    public void cancel() {
        this.status = ReservationStatus.CANCELLED;
    }

    public void convertToBorrow() {
        this.status = ReservationStatus.CONVERTED_TO_BORROW;
        this.convertedToBorrow = true;
        this.collectedAt = Instant.now();
    }
}
