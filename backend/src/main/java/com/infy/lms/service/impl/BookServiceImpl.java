package com.infy.lms.service.impl;

import com.infy.lms.dto.BookAvailabilityDTO;
import com.infy.lms.dto.BookDTO;
import com.infy.lms.dto.CreateBookRequest;
import com.infy.lms.exception.BookNotFoundException;
import com.infy.lms.exception.DuplicatesIsbnException;
import com.infy.lms.exception.BadRequestException;
import com.infy.lms.model.Book;
import com.infy.lms.repository.BookRepository;
import com.infy.lms.service.BookService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookServiceImpl implements BookService {

    private final BookRepository bookRepo;

    @Override
    @Transactional
    public Book create(CreateBookRequest req) {
        // duplicate ISBN check
        if (req.getIsbn() != null && bookRepo.existsByIsbn(req.getIsbn())) {
            throw new DuplicatesIsbnException("Book with ISBN already exists: " + req.getIsbn());
        }

        // basic validations
        if (req.getTotalCopies() != null && req.getTotalCopies() < 0) {
            throw new BadRequestException("totalCopies cannot be negative");
        }
        if (req.getAvailableCopies() != null && req.getAvailableCopies() < 0) {
            throw new BadRequestException("availableCopies cannot be negative");
        }

        int total = (req.getTotalCopies() == null) ? 0 : req.getTotalCopies();

        // if available provided but greater than total -> reject (safer)
        if (req.getAvailableCopies() != null && req.getAvailableCopies() > total) {
            throw new BadRequestException("availableCopies cannot be greater than totalCopies");
        }

        Book b = new Book();
        b.setTitle(req.getTitle());
        b.setAuthor(req.getAuthor());
        b.setIsbn(req.getIsbn());
        b.setPublisher(req.getPublisher());
        if (req.getMrp() != null) {
            b.setMrp(req.getMrp().doubleValue());
        }
        if (req.getAccessLevel() != null) {
            // normalize access level to lowercase ("normal" | "premium") to keep storage consistent
            b.setAccessLevel(req.getAccessLevel().toLowerCase());
        }

        b.setTags(req.getTags());

        // Use incoming category as alias for genre: prefer category if provided, else genre
        if (req.getCategory() != null) {
            b.setGenre(req.getCategory());
        } else if (req.getGenre() != null) {
            b.setGenre(req.getGenre());
        }

        b.setTotalCopies(total);

        int available = (req.getAvailableCopies() == null) ? total : req.getAvailableCopies();
        b.setAvailableCopies(available);

        // issued = total - available (defensive: never negative)
        int issued = Math.max(0, total - available);
        b.setIssuedCopies(issued);

        return bookRepo.save(b);
    }

    @Override
    public List<Book> findAllFiltered(String title, String author, String genre, Boolean available) {
        // keep it simple: if no filters -> findAll
        if (title == null && author == null && genre == null && available == null) {
            return bookRepo.findAll();
        }

        // naive filtering fallback: fetch all and filter in memory (ok for small data sets).
        // For prod use dynamic query / Specification / QueryDSL.
        return bookRepo.findAll().stream()
                .filter(b -> title == null || (b.getTitle() != null && b.getTitle().toLowerCase().contains(title.toLowerCase())))
                .filter(b -> author == null || (b.getAuthor() != null && b.getAuthor().toLowerCase().contains(author.toLowerCase())))
                .filter(b -> genre == null || (b.getGenre() != null && b.getGenre().equalsIgnoreCase(genre)))
                .filter(b -> available == null || (available ? b.getAvailableCopies() > 0 : b.getAvailableCopies() == 0))
                .toList();
    }

    // Overload to allow category/tags filtering if controller passes them later
    public List<Book> findAllFiltered(String title, String author, String genre, String category, String tags, Boolean available) {
        if (title == null && author == null && genre == null && category == null && tags == null && available == null) {
            return bookRepo.findAll();
        }

        return bookRepo.findAll().stream()
                .filter(b -> title == null || (b.getTitle() != null && b.getTitle().toLowerCase().contains(title.toLowerCase())))
                .filter(b -> author == null || (b.getAuthor() != null && b.getAuthor().toLowerCase().contains(author.toLowerCase())))
                .filter(b -> genre == null || (b.getGenre() != null && b.getGenre().equalsIgnoreCase(genre)))
                .filter(b -> category == null || (b.getGenre() != null && b.getGenre().equalsIgnoreCase(category)))
                .filter(b -> tags == null || (b.getTags() != null && b.getTags().toLowerCase().contains(tags.toLowerCase())))
                .filter(b -> available == null || (available ? b.getAvailableCopies() > 0 : b.getAvailableCopies() == 0))
                .toList();
    }

    @Override
    public Book findByIdOrThrow(Long id) {
        return bookRepo.findById(id).orElseThrow(() -> new BookNotFoundException("Book not found with id " + id));
    }

    @Override
    @Transactional
    public Book update(Long id, CreateBookRequest req) {
        Book existing = findByIdOrThrow(id);

        if (req.getIsbn() != null && !req.getIsbn().equals(existing.getIsbn())) {
            if (bookRepo.existsByIsbn(req.getIsbn())) {
                throw new DuplicatesIsbnException("ISBN already used by another book");
            }
            existing.setIsbn(req.getIsbn());
        }

        if (req.getTitle() != null) existing.setTitle(req.getTitle());
        if (req.getAuthor() != null) existing.setAuthor(req.getAuthor());
        if (req.getGenre() != null) existing.setGenre(req.getGenre());
        if (req.getPublisher() != null) existing.setPublisher(req.getPublisher());
        if (req.getCategory() != null) existing.setGenre(req.getCategory());
        if (req.getTags() != null) existing.setTags(req.getTags());
        if (req.getAccessLevel() != null) existing.setAccessLevel(req.getAccessLevel().toLowerCase());

        if (req.getTotalCopies() != null) {
            if (req.getTotalCopies() < 0) throw new BadRequestException("totalCopies cannot be negative");
            // If reducing totalCopies below issuedCopies -> reject to avoid inconsistency
            int currentIssued = existing.getIssuedCopies() == null ? 0 : existing.getIssuedCopies();
            if (req.getTotalCopies() < currentIssued) {
                throw new BadRequestException("totalCopies cannot be less than already issued copies (" + currentIssued + ")");
            }
            existing.setTotalCopies(req.getTotalCopies());
            // ensure availableCopies <= totalCopies
            if (existing.getAvailableCopies() > req.getTotalCopies()) {
                existing.setAvailableCopies(req.getTotalCopies());
            }
        }

        if (req.getAvailableCopies() != null) {
            if (req.getAvailableCopies() < 0 || req.getAvailableCopies() > existing.getTotalCopies()) {
                throw new BadRequestException("availableCopies out of bounds");
            }
            existing.setAvailableCopies(req.getAvailableCopies());
            int total = existing.getTotalCopies() == null ? 0 : existing.getTotalCopies();
            existing.setIssuedCopies(Math.max(0, total - req.getAvailableCopies()));
        }

        if (req.getMrp() != null) {
            existing.setMrp(req.getMrp().doubleValue());
        }


        return bookRepo.save(existing);
    }

    @Override
    @Transactional
    public Book patchAvailability(Long id, Integer newAvailable) {
        if (newAvailable == null) throw new BadRequestException("availableCopies must be provided");
        Book b = findByIdOrThrow(id);
        if (newAvailable < 0 || newAvailable > b.getTotalCopies()) {
            throw new BadRequestException("availableCopies must be between 0 and totalCopies");
        }
        int oldAvailable = (b.getAvailableCopies() == null ? 0 : b.getAvailableCopies());
        b.setAvailableCopies(newAvailable);
        int total = (b.getTotalCopies() == null ? 0 : b.getTotalCopies());
        b.setIssuedCopies(Math.max(0, total - newAvailable));

        // Optionally log audit here (user, oldAvailable, newAvailable) if you have audit table/service.

        return bookRepo.save(b);
    }


    @Override
    @Transactional
    public void delete(Long id) {
        Book b = bookRepo.findById(id).orElseThrow(() -> new BookNotFoundException("Book not found with id " + id));
        bookRepo.delete(b);
    }

    // -----------------------
    // NEW DTO-backed methods
    // -----------------------

    @Override
    @Transactional(readOnly = true)
    public List<BookDTO> search(String title, String author, String category, String genre, String tag, Boolean available) {
        // try repository-level search first (efficient)
        List<Book> results = bookRepo.search(
                isBlank(title) ? null : title,
                isBlank(author) ? null : author,
                isBlank(category) ? null : category,
                isBlank(genre) ? null : genre,
                isBlank(tag) ? null : tag,
                available
        );

        // fallback: repo.search should return matching books; if repo isn't populated or returns null, fallback to legacy filtering
        if (results == null || results.isEmpty()) {
            List<Book> fallback = findAllFiltered(title, author, genre, category, tag, available);
            return fallback.stream().map(this::toDto).collect(Collectors.toList());
        }

        return results.stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public BookDTO getByIdDto(Long id) {
        Book b = findByIdOrThrow(id);
        return toDto(b);
    }

    @Override
    @Transactional
    public BookDTO updateAvailabilityDto(Long id, BookAvailabilityDTO dto) {
        // reuse existing patchAvailability logic for validation and persistence
        Integer newAvail = dto.getAvailableCopies();
        Integer newIssued = dto.getIssuedCopies();

        Book b = findByIdOrThrow(id);

        if (newAvail != null) {
            if (newAvail < 0 || (b.getTotalCopies() != null && newAvail > b.getTotalCopies())) {
                throw new BadRequestException("availableCopies must be between 0 and totalCopies");
            }
            b.setAvailableCopies(newAvail);
        }

        if (newIssued != null) {
            if (newIssued < 0 || (b.getTotalCopies() != null && newIssued > b.getTotalCopies())) {
                throw new BadRequestException("issuedCopies must be between 0 and totalCopies");
            }
            b.setIssuedCopies(newIssued);
        }

        // ensure totalCopies is consistent
        int total = b.getTotalCopies() == null ? 0 : b.getTotalCopies();
        int avail = b.getAvailableCopies() == null ? 0 : b.getAvailableCopies();
        int issued = b.getIssuedCopies() == null ? 0 : b.getIssuedCopies();
        if (avail + issued > total) {
            // adjust total to be at least avail + issued
            b.setTotalCopies(avail + issued);
        }

        Book saved = bookRepo.save(b);
        return toDto(saved);
    }

    // -----------------------
    // Helpers
    // -----------------------

    private BookDTO toDto(Book b) {
        return BookDTO.builder()
                .id(b.getId())
                .title(b.getTitle())
                .author(b.getAuthor())
                .isbn(b.getIsbn())
                .totalCopies(b.getTotalCopies())
                .availableCopies(b.getAvailableCopies())
                .issuedCopies(b.getIssuedCopies())
                .genre(b.getGenre())
                .publisher(b.getPublisher())
                .category(b.getGenre())
                .tags(b.getTags())
                .tagList(b.tagList())
                .mrp(b.getMrp())
                .createdAt(b.getCreatedAt())
                .updatedAt(b.getUpdatedAt())
                .accessLevel(b.getAccessLevel())
                .build();
    }

    private boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    // Method kept for compatibility; now a no-op because DB uses 'genre' column
    @PostConstruct
    @Transactional
    public void syncExistingGenreAndCategory() {
        // no-op: DB has canonical 'genre' column
    }
}
