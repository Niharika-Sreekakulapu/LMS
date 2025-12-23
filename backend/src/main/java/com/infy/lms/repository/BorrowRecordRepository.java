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
    // Use start of day for consistent comparison (avoids timezone issues)
    @Query("SELECT br FROM BorrowRecord br " +
            "WHERE br.returnedAt IS NULL AND br.dueDate < :currentDate")
    List<BorrowRecord> findOverdue(Instant currentDate);

    // Overdue for a specific student
    @Query("SELECT br FROM BorrowRecord br " +
            "WHERE br.student.id = :studentId " +
            "AND br.returnedAt IS NULL AND br.dueDate < :currentDate")
    List<BorrowRecord> findOverdueByStudent(Long studentId, Instant currentDate);


    // ------------------------------
    // Filtering
    // ------------------------------

    // Filter by status (ISSUED, RETURNED, LOST, etc.)
    List<BorrowRecord> findByStatus(com.infy.lms.enums.BorrowStatus status);

    // Filter by book
     List<BorrowRecord> findByBookId(Long bookId);

    // Filter all for studentId
    List<BorrowRecord> findByStudentId(Long studentId);

    // ------------------------------
    // Aggregation queries for analytics (supports optional filters)
    // ------------------------------

    /**
     * Returns book title and count of borrows grouped by book title for given filters.
     * Result rows: Object[]{ title (String), count (BigInteger or Number) }
     */
    @Query(value = "SELECT b.title AS title, COUNT(*) AS cnt FROM borrow_records br JOIN books b ON br.book_id = b.id " +
            "WHERE (:start IS NULL OR br.borrowed_at >= :start) AND (:end IS NULL OR br.borrowed_at <= :end) " +
            "AND (:membershipType IS NULL OR EXISTS(SELECT 1 FROM users u WHERE u.id = br.student_id AND u.membership_type = :membershipType)) " +
            "AND (:department IS NULL OR EXISTS(SELECT 1 FROM users u WHERE u.id = br.student_id AND u.course = :department)) " +
            "AND (:location IS NULL OR EXISTS(SELECT 1 FROM users u WHERE u.id = br.student_id AND u.address LIKE CONCAT('%', :location, '%'))) " +
            "GROUP BY b.title", nativeQuery = true)
    List<Object[]> countBorrowsGroupedByBook(Instant start, Instant end, String membershipType, String department, String location);

    /**
     * Returns genre and count of borrows grouped by genre for given filters.
     * Result rows: Object[]{ genre (String), count (BigInteger or Number) }
     */
    @Query(value = "SELECT b.genre AS genre, COUNT(*) AS cnt FROM borrow_records br JOIN books b ON br.book_id = b.id " +
            "WHERE (:start IS NULL OR br.borrowed_at >= :start) AND (:end IS NULL OR br.borrowed_at <= :end) " +
            "AND (:membershipType IS NULL OR EXISTS(SELECT 1 FROM users u WHERE u.id = br.student_id AND u.membership_type = :membershipType)) " +
            "AND (:department IS NULL OR EXISTS(SELECT 1 FROM users u WHERE u.id = br.student_id AND u.course = :department)) " +
            "AND (:location IS NULL OR EXISTS(SELECT 1 FROM users u WHERE u.id = br.student_id AND u.address LIKE CONCAT('%', :location, '%'))) " +
            "GROUP BY b.genre", nativeQuery = true)
    List<Object[]> countBorrowsGroupedByGenre(Instant start, Instant end, String membershipType, String department, String location);

    /**
     * Returns day and count of borrows per day for given filters (time-series).
     * Result rows: Object[]{ day (java.sql.Date), count (BigInteger or Number) }
     */
    @Query(value = "SELECT DATE(br.borrowed_at) AS day, COUNT(*) AS cnt FROM borrow_records br " +
            "WHERE (:start IS NULL OR br.borrowed_at >= :start) AND (:end IS NULL OR br.borrowed_at <= :end) " +
            "AND (:membershipType IS NULL OR EXISTS(SELECT 1 FROM users u WHERE u.id = br.student_id AND u.membership_type = :membershipType)) " +
            "AND (:department IS NULL OR EXISTS(SELECT 1 FROM users u WHERE u.id = br.student_id AND u.course = :department)) " +
            "AND (:location IS NULL OR EXISTS(SELECT 1 FROM users u WHERE u.id = br.student_id AND u.address LIKE CONCAT('%', :location, '%'))) " +
            "GROUP BY DATE(br.borrowed_at) ORDER BY DATE(br.borrowed_at)", nativeQuery = true)
    List<Object[]> countBorrowsByDay(Instant start, Instant end, String membershipType, String department, String location);

}
