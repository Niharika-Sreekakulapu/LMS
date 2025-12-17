package com.infy.lms.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateBookRequestDTO {
    @NotNull
    private Long bookId;
    // optionally allow message/note
    private String note;
}
