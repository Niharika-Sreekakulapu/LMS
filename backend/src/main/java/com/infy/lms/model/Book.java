package com.infy.lms.model;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Entity
@Table(name = "books")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Book {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    private String author;

    private String isbn;

    @Column(name = "total_copies", nullable = false)
    private Integer totalCopies = 0;

    // NEW fields
    private String genre;
    private String publisher;

    @Column(name = "access_level")
    @JsonProperty("accessLevel")
    private String accessLevel;

    public void setGenre(String genre) {
        this.genre = genre;
    }

    /**
     * Comma-separated tags for legacy storage. Prefer tagList() for programmatic access.
     */
    private String tags;

    @Column(name = "available_copies", nullable = false)
    private Integer availableCopies = 0;

    @Column(name = "issued_copies", nullable = false)
    private Integer issuedCopies = 0;

    @Column(name = "mrp")
    private Double mrp;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    // convenience: return tags as list
    public List<String> tagList() {
        if (this.tags == null || this.tags.trim().isEmpty()) return List.of();
        return Arrays.stream(this.tags.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
    }

    // convenience methods for inventory updates (used in services)
    public void decrementAvailableAndIncrementIssued() {
        if (this.availableCopies == null) this.availableCopies = 0;
        if (this.issuedCopies == null) this.issuedCopies = 0;
        if (this.availableCopies <= 0) {
            throw new IllegalStateException("No available copies");
        }
        this.availableCopies = this.availableCopies - 1;
        this.issuedCopies = this.issuedCopies + 1;
    }

    public void incrementAvailableAndDecrementIssued() {
        if (this.availableCopies == null) this.availableCopies = 0;
        if (this.issuedCopies == null) this.issuedCopies = 0;
        this.availableCopies = this.availableCopies + 1;
        if (this.issuedCopies > 0) this.issuedCopies = this.issuedCopies - 1;
    }

    @PrePersist
    public void prePersist() {
        Instant now = Instant.now();
        if (this.createdAt == null) this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = Instant.now();
    }

}
