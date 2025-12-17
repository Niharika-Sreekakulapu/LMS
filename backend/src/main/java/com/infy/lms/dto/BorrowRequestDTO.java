package com.infy.lms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BorrowRequestDTO {
    private Long studentId;
    private Long bookId;

    // optional, service will use now() if null
    private Instant issueDate;
    private Instant dueDate;
}
