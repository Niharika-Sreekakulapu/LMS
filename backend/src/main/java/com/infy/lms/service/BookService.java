package com.infy.lms.service;

import com.infy.lms.dto.BookAvailabilityDTO;
import com.infy.lms.dto.BookDTO;
import com.infy.lms.dto.CreateBookRequest;
import com.infy.lms.model.Book;

import java.util.List;

/**
 * Backwards-compatible BookService.
 *
 * - Keeps legacy methods returning domain Book so existing callers don't break.
 * - Adds new DTO-based methods for the improved API surface (search, availability patch).
 */
public interface BookService {

    // legacy / existing
    Book create(CreateBookRequest req);

    /**
     * Existing simple filter method (kept for backward compatibility).
     */
    List<Book> findAllFiltered(String title, String author, String genre, Boolean available);

    /**
     * New overload that also supports category & tags filtering.
     */
    List<Book> findAllFiltered(String title, String author, String genre, String category, String tags, Boolean available);

    Book findByIdOrThrow(Long id);

    Book update(Long id, CreateBookRequest req);

    /**
     * Legacy availability patch that takes a simple integer newAvailable (kept for compatibility).
     */
    Book patchAvailability(Long id, Integer newAvailable);

    void delete(Long id);

    // --- NEW methods (DTO-centric) ---

    /**
     * Flexible search that returns DTOs for API responses.
     * Accepts optional params; pass null to ignore a filter.
     */
    List<BookDTO> search(String title, String author, String category, String genre, String tag, Boolean available);

    /**
     * DTO-backed getter.
     */
    BookDTO getByIdDto(Long id);

    /**
     * DTO-backed availability patch.
     */
    BookDTO updateAvailabilityDto(Long id, BookAvailabilityDTO dto);
}
