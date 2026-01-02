package com.infy.lms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AdminActionResponse {
    private String message;
    private Long id;
    private String status;
}
