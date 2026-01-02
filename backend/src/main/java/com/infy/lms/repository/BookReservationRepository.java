package com.infy.lms.repository;

import com.infy.lms.model.BookReservation;
import com.infy.lms.model.Book;
import com.infy.lms.model.User;
import com.infy.lms.model.BookReservation.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookReservationRepository extends JpaRepository<BookReservation, Long> {

    // Find active reservations for a book
    List<BookReservation> findByBookAndStatus(Book book, ReservationStatus status);

    // Find active reservations for a student
    List<BookReservation> findByStudentAndStatus(User student, ReservationStatus status);

    // Find reservation for a specific student and book
    Optional<BookReservation> findByStudentAndBookAndStatus(User student, Book book, ReservationStatus status);

    // Find expired reservations that need to be cleaned up
    @Query("SELECT r FROM BookReservation r WHERE r.status = :status AND r.expiresAt < :now")
    List<BookReservation> findExpiredReservations(@Param("status") ReservationStatus status, @Param("now") Instant now);

    // Find reservations that need notifications
    List<BookReservation> findByStatusAndNotificationSentFalse(ReservationStatus status);

    // Count active reservations for a book
    long countByBookAndStatus(Book book, ReservationStatus status);

    // Find all reservations for a book (any status)
    List<BookReservation> findByBook(Book book);
}
