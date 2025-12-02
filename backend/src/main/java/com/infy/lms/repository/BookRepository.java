package com.infy.lms.repository;

import com.infy.lms.model.Book;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface BookRepository extends JpaRepository<Book, Long> {

    /**
     * Atomically decrement available_copies by 1 if available_copies > 0.
     * Returns number of rows updated (1 if succeeded, 0 if none available).
     */
    @Modifying
    @Transactional
    @Query("UPDATE Book b SET b.availableCopies = b.availableCopies - 1 WHERE b.id = :bookId AND b.availableCopies > 0")
    int decrementAvailableCopiesIfAvailable(@Param("bookId") Long bookId);
}
