package com.infy.lms.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class BorrowHistoryDTO {
    private String bookTitle;
    private Instant borrowedAt;
    private Instant dueDate;
    private Instant returnedAt;
    private double fine;
}
