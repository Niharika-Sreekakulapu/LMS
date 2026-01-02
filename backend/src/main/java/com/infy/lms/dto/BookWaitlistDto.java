package com.infy.lms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookWaitlistDto {

    private Long id;
    private Long bookId;
    private String bookTitle;
    private String bookAuthor;
    private Long studentId;
    private String studentName;
    private String studentEmail;

    private Instant joinedAt;
    private BigDecimal priorityScore;
    private Integer queuePosition;
    private Integer estimatedWaitDays;

    // Priority breakdown
    private Integer waitingDays;
    private BigDecimal courseUrgencyBonus;
    private BigDecimal lateReturnPenalty;
    private BigDecimal membershipBonus;

    private Boolean isActive;

    // Additional computed fields
    private String priorityReason;
    private String estimatedAvailableDate;
}
