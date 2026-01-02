package com.infy.lms.dto;

import com.infy.lms.model.AcquisitionRequest;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AcquisitionRequestResponseDto {
    private Long id;
    private Long studentId;
    private String bookName;
    private String author;
    private String publisher;
    private String edition;
    private String genre;
    private String justification;
    private AcquisitionRequest.Status status;
    private Long reviewedBy;
    private LocalDateTime reviewedAt;
    private String rejectionReason;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
