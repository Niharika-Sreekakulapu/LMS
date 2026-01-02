package com.infy.lms.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
public class BorrowHistoryDTO {

    private Long id;                // BorrowRecord ID
    private Long studentId;         // Student ID
    private String studentName;     // Student name
    private Long bookId;            // Book ID
    private String bookTitle;       // Book title
    private String bookAuthor;      // Book author
    private Double bookMrp;         // Book MRP price
    private String bookGenre;       // Book genre
    private String bookPublisher;   // Book publisher
    private String bookIsbn;        // Book ISBN
    private String bookCategory;    // Book category
    private String bookDescription; // Book description

    private Instant borrowedAt;     // Borrow date
    private Instant dueDate;        // Due date
    private Instant returnedAt;     // Return date (null if not returned)

    private String status;          // BORROWED, RETURNED, LATE_RETURNED, LOST, OVERDUE

    private boolean isOverdue;      // true if dueDate < now and returnedAt == null

    private BigDecimal penaltyAmount;           // pending penalty amount (BigDecimal)
    private String penaltyType;                 // NONE, LATE, DAMAGE, LOST
    private String penaltyStatus;               // NONE, PENDING, PAID
}
