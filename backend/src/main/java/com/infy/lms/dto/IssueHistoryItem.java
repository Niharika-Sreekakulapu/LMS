package com.infy.lms.dto;

import java.time.LocalDate;

public class IssueHistoryItem {
    private Long issueId;
    private Long bookId;
    private String bookTitle;
    private Long userId;
    private LocalDate issueDate;
    private LocalDate dueDate;
    private LocalDate returnDate; // nullable
    private Double penalty;
    private String status;

    // getters & setters
    public Long getIssueId() { return issueId; }
    public void setIssueId(Long issueId) { this.issueId = issueId; }
    public Long getBookId() { return bookId; }
    public void setBookId(Long bookId) { this.bookId = bookId; }
    public String getBookTitle() { return bookTitle; }
    public void setBookTitle(String bookTitle) { this.bookTitle = bookTitle; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public java.time.LocalDate getIssueDate() { return issueDate; }
    public void setIssueDate(java.time.LocalDate issueDate) { this.issueDate = issueDate; }
    public java.time.LocalDate getDueDate() { return dueDate; }
    public void setDueDate(java.time.LocalDate dueDate) { this.dueDate = dueDate; }
    public java.time.LocalDate getReturnDate() { return returnDate; }
    public void setReturnDate(java.time.LocalDate returnDate) { this.returnDate = returnDate; }
    public Double getPenalty() { return penalty; }
    public void setPenalty(Double penalty) { this.penalty = penalty; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
