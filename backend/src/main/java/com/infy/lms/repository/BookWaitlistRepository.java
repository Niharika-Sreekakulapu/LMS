package com.infy.lms.repository;

import com.infy.lms.model.BookWaitlist;
import com.infy.lms.model.Book;
import com.infy.lms.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BookWaitlistRepository extends JpaRepository<BookWaitlist, Long> {

    // Find active waitlist entries for a specific book
    List<BookWaitlist> findByBookAndIsActiveTrueOrderByPriorityScoreDesc(Book book);

    // Find active waitlist entries for a specific student
    List<BookWaitlist> findByStudentAndIsActiveTrue(User student);

    // Check if student is already in waitlist for a book
    Optional<BookWaitlist> findByStudentAndBookAndIsActiveTrue(User student, Book book);

    // Count active waitlist entries for a book
    long countByBookAndIsActiveTrue(Book book);

    // Find all active waitlist entries ordered by priority for a book
    @Query("SELECT w FROM BookWaitlist w WHERE w.book = :book AND w.isActive = true ORDER BY w.priorityScore DESC, w.joinedAt ASC")
    List<BookWaitlist> findActiveWaitlistForBook(@Param("book") Book book);

    // Update queue positions for a book
    @Query("UPDATE BookWaitlist w SET w.queuePosition = :position WHERE w.id = :id")
    void updateQueuePosition(@Param("id") Long id, @Param("position") Integer position);

    // Find waitlist entries that need priority recalculation (older than specified time)
    @Query("SELECT w FROM BookWaitlist w WHERE w.isActive = true AND w.lastUpdated < :cutoffTime")
    List<BookWaitlist> findStaleWaitlistEntries(@Param("cutoffTime") java.time.Instant cutoffTime);

    // Find all entries for a student-book combination (both active and inactive)
    List<BookWaitlist> findByStudentAndBook(User student, Book book);

    // Find all active waitlist entries across all books
    List<BookWaitlist> findByIsActiveTrue();
}
