package com.infy.lms.controller;

import com.infy.lms.model.Book;
import com.infy.lms.repository.BookRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/books")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class BookController {

    private final BookRepository bookRepository;

    @PostMapping("/add")
    public ResponseEntity<Book> addBook(@RequestBody Book book) {
        // If availableCopies is not provided, set it = totalCopies
        if (book.getAvailableCopies() == 0 && book.getTotalCopies() > 0) {
            book.setAvailableCopies(book.getTotalCopies());
        }

        Book saved = bookRepository.save(book);
        return ResponseEntity.ok(saved);
    }

    @GetMapping
    public ResponseEntity<?> getAllBooks() {
        return ResponseEntity.ok(bookRepository.findAll());
    }
}
