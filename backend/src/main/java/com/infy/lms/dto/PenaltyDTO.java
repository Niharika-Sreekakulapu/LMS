package com.infy.lms.dto;

import com.infy.lms.model.BorrowRecord;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
public class PenaltyDTO {
    private Long borrowRecordId;
    private Long studentId;
    private String studentName;
    private Long bookId;
    private String bookTitle;
    private Instant borrowedAt;
    private Instant dueDate;
    private BigDecimal penaltyAmount;
    private BorrowRecord.PenaltyType penaltyType;
    private BorrowRecord.PenaltyStatus penaltyStatus;
}
