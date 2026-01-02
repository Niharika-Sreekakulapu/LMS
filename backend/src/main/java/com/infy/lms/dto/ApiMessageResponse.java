package com.infy.lms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ApiMessageResponse {
    private String message;
    private Instant timestamp = Instant.now();
}
