package com.infy.lms.controller;

import com.infy.lms.dto.BookAvailabilityDTO;
import com.infy.lms.dto.BookDTO;
import com.infy.lms.dto.CreateBookRequest;
import com.infy.lms.exception.BadRequestException;
import com.infy.lms.exception.BookNotFoundException;
import com.infy.lms.model.Book;
import com.infy.lms.repository.BorrowRecordRepository;
import com.infy.lms.service.BookService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/books")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class BookController {

    private final BookService bookService;

    // Create book (legacy: returns domain Book)
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','LIBRARIAN')")
    public ResponseEntity<Book> addBook(@RequestBody @Valid CreateBookRequest req) {
        Book saved = bookService.create(req);
        URI location = URI.create("/api/books/" + saved.getId());
        return ResponseEntity.created(location).body(saved);
    }

    // Legacy: Get all books (supports optional query params for simple filtering) - returns domain list
    @GetMapping
    public ResponseEntity<List<Book>> getAllBooks(
            @RequestParam(value = "title", required = false) String title,
            @RequestParam(value = "author", required = false) String author,
            @RequestParam(value = "genre", required = false) String genre,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "tags", required = false) String tags,
            @RequestParam(value = "available", required = false) Boolean available
    ) {
        List<Book> list = bookService.findAllFiltered(title, author, genre, category, tags, available);
        return ResponseEntity.ok(list);
    }

    // NEW: Flexible search returning DTOs for frontend
    // GET /api/books/search?title=&author=&category=&genre=&tag=&available=
    @GetMapping("/search")
    public ResponseEntity<List<BookDTO>> search(
            @RequestParam(value = "title", required = false) String title,
            @RequestParam(value = "author", required = false) String author,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "genre", required = false) String genre,
            @RequestParam(value = "tag", required = false) String tag,
            @RequestParam(value = "available", required = false) Boolean available
    ) {
        return ResponseEntity.ok(bookService.search(title, author, category, genre, tag, available));
    }

    // Get by id — returns DTO (preferred for frontend)
    @GetMapping("/{id}")
    public ResponseEntity<BookDTO> getBookById(@PathVariable("id") Long id) {
        try {
            BookDTO dto = bookService.getByIdDto(id);
            return ResponseEntity.ok(dto);
        } catch (com.infy.lms.exception.BookNotFoundException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    // Update (legacy: returns domain Book)
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','LIBRARIAN')")
    public ResponseEntity<Book> updateBook(@PathVariable("id") Long id,
                                           @RequestBody @Valid CreateBookRequest req) {
        Book updated = bookService.update(id, req);
        return ResponseEntity.ok(updated);
    }

    // NEW: Patch availability — accepts DTO and returns DTO (admin/librarian)
    @PreAuthorize("hasAnyRole('ADMIN','LIBRARIAN')")
    @PostMapping("/{id}/availability")
    public ResponseEntity<BookDTO> patchAvailabilityFlexible(@PathVariable("id") Long id,
                                                             @RequestBody BookAvailabilityDTO payload) {
        BookDTO updated = bookService.updateAvailabilityDto(id, payload);
        return ResponseEntity.ok(updated);
    }


    // Delete (legacy)
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','LIBRARIAN')")
    public ResponseEntity<Void> deleteBook(@PathVariable("id") Long id) {
        bookService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
