package com.infy.lms.dto;

import com.infy.lms.model.BookReservation;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookReservationDto {

    private Long id;
    private Long bookId;
    private String bookTitle;
    private Long studentId;
    private String studentName;
    private String studentEmail;

    private Instant reservedAt;
    private Instant expiresAt;
    private BookReservation.ReservationStatus status;
    private Boolean notificationSent;

    private String timeRemaining;
    private Boolean isExpired;
    private Boolean isActive;
}
