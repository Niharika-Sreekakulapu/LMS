package com.infy.lms.dto;

import lombok.Data;

@Data
public class BorrowRequestDTO {
    private Long studentId;
    private Long bookId;
}
