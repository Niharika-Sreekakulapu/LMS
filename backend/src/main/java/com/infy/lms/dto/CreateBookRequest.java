package com.infy.lms.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Matches fields in Book entity.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateBookRequest {

    @NotBlank
    private String title;

    @NotBlank
    private String author;

    private String isbn;

    @Min(0)
    private Integer totalCopies;

    // optional — if not provided, service will set availableCopies = totalCopies
    @Min(0)
    private Integer availableCopies;

    private String genre;
    private String publisher;

    @NotNull(message = "MRP is required for penalty calculations")
    @Min(value = 0, message = "MRP must be non-negative")
    private Double mrp;   // FIXED: was Long, now matches Book.mrp

    private String category;

    private String accessLevel; // "normal" or "premium"

    /**
     * Comma-separated tags — simple and matches your DB.
     */
    private String tags;
}
