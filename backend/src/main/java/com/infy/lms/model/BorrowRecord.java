package com.infy.lms.model;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import com.infy.lms.enums.BorrowStatus;

@Entity
@Table(name = "borrow_records")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BorrowRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @ManyToOne
    @JoinColumn(name = "book_id", nullable = false)
    private Book book;

    private Instant borrowedAt;

    private Instant dueDate;

    private Instant returnedAt;

    private double fineAmount;  // calculated fine

    @Enumerated(EnumType.STRING)
    private BorrowStatus status;
}
