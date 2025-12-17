package com.infy.lms.repository;

import com.infy.lms.model.BorrowRecord;
import com.infy.lms.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;

public interface BorrowRecordRepository extends JpaRepository<BorrowRecord, Long> {

    // Existing method (kept)
    List<BorrowRecord> findByStudent(User student);


    // ------------------------------
    // Borrow / Active / Returned filtering
    // ------------------------------

    // All currently borrowed (not yet returned)
    List<BorrowRecord> findByReturnedAtIsNull();

    // All returned records
    List<BorrowRecord> findByReturnedAtIsNotNull();

    // All active borrows for a student
    List<BorrowRecord> findByStudentAndReturnedAtIsNull(User student);


    // ------------------------------
    // Overdue queries
    // ------------------------------

    // Generic overdue query - ANY overdue record
    @Query("SELECT br FROM BorrowRecord br " +
            "WHERE br.returnedAt IS NULL AND br.dueDate < :now")
    List<BorrowRecord> findOverdue(Instant now);

    // Overdue for a specific student
    @Query("SELECT br FROM BorrowRecord br " +
            "WHERE br.student.id = :studentId " +
            "AND br.returnedAt IS NULL AND br.dueDate < :now")
    List<BorrowRecord> findOverdueByStudent(Long studentId, Instant now);


    // ------------------------------
    // Filtering
    // ------------------------------

    // Filter by status (ISSUED, RETURNED, LOST, etc.)
    List<BorrowRecord> findByStatus(com.infy.lms.enums.BorrowStatus status);

    // Filter by book
     List<BorrowRecord> findByBookId(Long bookId);

    // Filter all for studentId
    List<BorrowRecord> findByStudentId(Long studentId);

}
