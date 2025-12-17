package com.infy.lms.repository;

import com.infy.lms.model.Book;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BookRepository extends JpaRepository<Book, Long> {

    // existing atomic decrement (keep if present)
    @Modifying
    @Transactional
    @Query("UPDATE Book b SET b.availableCopies = b.availableCopies - 1 WHERE b.id = :bookId AND b.availableCopies > 0")
    int decrementAvailableCopiesIfAvailable(@Param("bookId") Long bookId);

    @Modifying
    @Transactional
    @Query("UPDATE Book b SET b.availableCopies = b.availableCopies + 1 WHERE b.id = :bookId")
    int incrementAvailableCopies(@Param("bookId") Long bookId);

    @Modifying
    @Transactional
    @Query("UPDATE Book b SET b.availableCopies = b.availableCopies - 1, b.issuedCopies = (CASE WHEN b.issuedCopies IS NULL THEN 1 ELSE b.issuedCopies + 1 END) "
            + "WHERE b.id = :id AND b.availableCopies > 0")
    int decrementAvailableAndIncrementIssuedIfAvailable(@Param("id") Long id);

    boolean existsByIsbn(String isbn);

    Optional<Book> findByIsbn(String isbn);

    // Check if book exists by exact title, author, and publisher combination
    // Find exact matching books by title, author, and publisher
    @Query("SELECT b FROM Book b WHERE LOWER(TRIM(b.title)) = LOWER(TRIM(:title)) AND " +
           "((:author IS NULL AND b.author IS NULL) OR (:author IS NOT NULL AND LOWER(TRIM(b.author)) = LOWER(TRIM(:author)))) AND " +
           "((:publisher IS NULL AND b.publisher IS NULL) OR (:publisher IS NOT NULL AND LOWER(TRIM(b.publisher)) = LOWER(TRIM(:publisher))))")
    List<Book> findExactMatches(@Param("title") String title,
                               @Param("author") String author,
                               @Param("publisher") String publisher);

    // Debug method to find all books by title
    @Query("SELECT b FROM Book b WHERE LOWER(TRIM(b.title)) = LOWER(TRIM(:title))")
    List<Book> findByTitleIgnoreCase(@Param("title") String title);

    // -----------------------------
    // Flexible search with optional filters (title, author, category, genre, tags substring, availability)
    // -----------------------------
    @Query("SELECT b FROM Book b " +
            "WHERE (:title IS NULL OR LOWER(b.title) LIKE LOWER(CONCAT('%',:title,'%'))) " +
            "AND (:author IS NULL OR LOWER(b.author) LIKE LOWER(CONCAT('%',:author,'%'))) " +
            "AND (:category IS NULL OR LOWER(b.genre) = LOWER(:category)) " +
            "AND (:genre IS NULL OR LOWER(b.genre) = LOWER(:genre)) " +
            "AND (:tag IS NULL OR LOWER(b.tags) LIKE LOWER(CONCAT('%',:tag,'%'))) " +
            "AND ( :available IS NULL OR ( :available = true AND b.availableCopies > 0 ) OR ( :available = false AND (b.availableCopies IS NULL OR b.availableCopies = 0) ) )")
    List<Book> search(@Param("title") String title,
                      @Param("author") String author,
                      @Param("category") String category,
                      @Param("genre") String genre,
                      @Param("tag") String tag,
                          @Param("available") Boolean available);

    // Find books by access level (normal/premium) - case insensitive
    @Query("SELECT b FROM Book b WHERE LOWER(b.accessLevel) = LOWER(?1)")
    List<Book> findByAccessLevelIgnoreCase(String accessLevel);

    // Find books with null access level
    List<Book> findByAccessLevelIsNull();

}
