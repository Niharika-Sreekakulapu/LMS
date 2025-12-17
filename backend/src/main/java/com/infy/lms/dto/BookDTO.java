package com.infy.lms.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
@Builder
public class BookDTO {
    private Long id;
    private String title;
    private String author;
    private String isbn;
    private Integer totalCopies;
    private Integer availableCopies;
    private Integer issuedCopies;
    private String genre;
    private String publisher;
    private String category;
    private String tags;
    private List<String> tagList;
    private Double mrp;
    private Instant createdAt;
    private Instant updatedAt;
    private String accessLevel;
}
