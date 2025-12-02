package com.infy.lms.service.impl;

import com.infy.lms.exception.BookNotFoundException;
import com.infy.lms.model.Book;
import com.infy.lms.repository.BookRepository;
import com.infy.lms.service.BookService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class BookServiceImpl implements BookService {

    private final BookRepository bookRepository;

    @Override
    public Book findBookById(Long id) {
        return bookRepository.findById(id)
                .orElseThrow(() -> new BookNotFoundException("Book not found"));
    }
}
