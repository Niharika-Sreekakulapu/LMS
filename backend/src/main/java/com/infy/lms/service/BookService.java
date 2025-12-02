package com.infy.lms.service;

import com.infy.lms.model.Book;

public interface BookService {
    Book findBookById(Long id);
}
