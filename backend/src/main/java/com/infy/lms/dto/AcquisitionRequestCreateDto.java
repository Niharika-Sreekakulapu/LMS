package com.infy.lms.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AcquisitionRequestCreateDto {
    @NotBlank
    private String bookName;
    private String author;
    private String publisher;
    private String version; // Changed from edition to match frontend
    private String genre;  // Added genre field
    private String justification;
}
