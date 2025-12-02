package com.infy.lms.dto;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public class ReturnRequest {

    @NotNull(message = "issueId is required")
    private Long issueId;

    // If null = today
    private LocalDate returnDate;

    public Long getIssueId() { return issueId; }
    public void setIssueId(Long issueId) { this.issueId = issueId; }

    public LocalDate getReturnDate() { return returnDate; }
    public void setReturnDate(LocalDate returnDate) { this.returnDate = returnDate; }
}
