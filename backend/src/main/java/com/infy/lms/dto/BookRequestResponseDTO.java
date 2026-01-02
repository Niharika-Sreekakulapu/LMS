package com.infy.lms.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
public class BookRequestResponseDTO {

    private Long id;

    private Long studentId;
    private String studentName;

    private Long bookId;
    private String bookTitle;
    private String bookAuthor;
    private String bookPublisher;
    private String bookCategory;
    private String genre;
    private String edition;

    private String status;

    private Instant requestedAt;
    private Instant processedAt;

    // For frontend compatibility
    private Instant requestDate;

    private Long processedById;
    private String processedByName;

    private String reason;

    // ★ NEW FIELD
    private Long issuedRecordId;
}
