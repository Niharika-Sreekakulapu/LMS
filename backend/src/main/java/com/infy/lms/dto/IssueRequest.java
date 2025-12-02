package com.infy.lms.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public class IssueRequest {
    @NotNull(message = "bookId is required")
    private Long bookId;
    @NotNull(message = "userId is required")
    private Long userId;
    private LocalDate issueDate; // optional
    private LocalDate dueDate;   // optional

    // getters/setters
    public Long getBookId() { return bookId; }
    public void setBookId(Long bookId) { this.bookId = bookId; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public LocalDate getIssueDate() { return issueDate; }
    public void setIssueDate(LocalDate issueDate) { this.issueDate = issueDate; }
    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }
}
