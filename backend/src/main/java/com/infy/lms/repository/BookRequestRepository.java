package com.infy.lms.repository;

import com.infy.lms.model.BookRequest;
import com.infy.lms.model.RequestStatus;
import com.infy.lms.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;

public interface BookRequestRepository extends JpaRepository<BookRequest, Long> {
    List<BookRequest> findByStatus(RequestStatus status);
    Page<BookRequest> findByStatus(RequestStatus status, Pageable pageable);
    List<BookRequest> findByStudentId(Long studentId);
    List<BookRequest> findByStudentAndRequestedAtBetween(User student, Instant startDate, Instant endDate);
    List<BookRequest> findByStudentIdAndBookId(Long studentId, Long bookId);
    List<BookRequest> findByStudentIdAndBookIdAndStatusIn(Long studentId, Long bookId, List<RequestStatus> statuses);

    @Query("SELECT r FROM BookRequest r LEFT JOIN FETCH r.student LEFT JOIN FETCH r.book")
    List<BookRequest> findAllWithDetails();

    @Query("SELECT r FROM BookRequest r LEFT JOIN FETCH r.student LEFT JOIN FETCH r.book WHERE r.status = :status")
    List<BookRequest> findByStatusWithDetails(RequestStatus status);

    @Query("SELECT r FROM BookRequest r LEFT JOIN FETCH r.student LEFT JOIN FETCH r.book WHERE r.status = :status")
    Page<BookRequest> findByStatusWithDetailsPaginated(RequestStatus status, Pageable pageable);

    @Query("SELECT r FROM BookRequest r LEFT JOIN FETCH r.student LEFT JOIN FETCH r.book WHERE r.student.id = :studentId")
    List<BookRequest> findByStudentIdWithDetails(Long studentId);

    // More queries can be added as needed
}
