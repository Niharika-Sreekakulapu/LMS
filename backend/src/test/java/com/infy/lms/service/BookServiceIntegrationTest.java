package com.infy.lms.service;

import com.infy.lms.dto.CreateBookRequest;
import com.infy.lms.model.Book;
import com.infy.lms.repository.BookRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.boot.CommandLineRunner;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import(com.infy.lms.service.impl.BookServiceImpl.class)
public class BookServiceIntegrationTest {

    @Autowired
    private BookService bookService;

    @Autowired
    private BookRepository bookRepository;

    @Test
    @Transactional
    public void createBook_normalizesAccessAndStoresTags_andAcceptsCategoryAlias() {
        CreateBookRequest req = new CreateBookRequest();
        req.setTitle("Integration Test Book");
        req.setAuthor("Tester");
        req.setIsbn("INT-12345");
        req.setTotalCopies(5);
        req.setAvailableCopies(5);
        req.setMrp(100.0);

        // Use category as alias for genre to verify alias behavior
        req.setCategory("Science Fiction");

        // Mixed-case access level to verify normalization
        req.setAccessLevel("PREMIUM");

        // Frontend maps description -> tags; simulate that
        req.setTags("a short description about the book");

        Book saved = bookService.create(req);

        assertThat(saved.getId()).isNotNull();
        // stored access level should be normalized to lowercase
        assertThat(saved.getAccessLevel()).isEqualTo("premium");
        // tags should be stored unchanged from request
        assertThat(saved.getTags()).isEqualTo("a short description about the book");
        // category should have been applied to genre
        assertThat(saved.getGenre()).isEqualTo("Science Fiction");

        // also verify persistence via repository lookup
        Book fetched = bookRepository.findById(saved.getId()).orElseThrow();
        assertThat(fetched.getAccessLevel()).isEqualTo("premium");
        assertThat(fetched.getTags()).isEqualTo("a short description about the book");
    }

    // No additional context required - DataJpaTest + importing BookServiceImpl keeps test lightweight.
}
