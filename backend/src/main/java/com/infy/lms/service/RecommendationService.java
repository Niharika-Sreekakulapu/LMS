package com.infy.lms.service;

import com.infy.lms.dto.BookDTO;
import com.infy.lms.model.Book;
import com.infy.lms.model.BorrowRecord;
import com.infy.lms.model.User;
import com.infy.lms.repository.BookRepository;
import com.infy.lms.repository.BorrowRecordRepository;
import com.infy.lms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RecommendationService {

    private final BookRepository bookRepository;
    private final BorrowRecordRepository borrowRecordRepository;
    private final UserRepository userRepository;

    public List<BookDTO> getRecommendationsForUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Get user's borrow history
        List<BorrowRecord> borrowHistory = borrowRecordRepository.findByStudentId(userId);

        // If user has no borrow history, return popular books
        if (borrowHistory.isEmpty()) {
            return getPopularBooks(10);
        }

        // Calculate recommendation scores
        Map<Book, Double> bookScores = new HashMap<>();

        // 1. Category relevance based on borrow history
        Map<String, Integer> genrePreferences = getGenrePreferences(borrowHistory);
        Map<String, Integer> tagPreferences = getTagPreferences(borrowHistory);

        // 2. Get all available books (not borrowed by user and have available copies)
        List<Book> allBooks = bookRepository.findAll();
        Set<Long> borrowedBookIds = borrowHistory.stream()
                .map(br -> br.getBook().getId())
                .collect(Collectors.toSet());

        List<Book> candidateBooks = allBooks.stream()
                .filter(book -> !borrowedBookIds.contains(book.getId()))
                .filter(book -> book.getAvailableCopies() > 0)
                .collect(Collectors.toList());

        // 3. Calculate scores for each candidate book
        for (Book book : candidateBooks) {
            double score = calculateRecommendationScore(book, genrePreferences, tagPreferences, borrowHistory);
            bookScores.put(book, score);
        }

        // 4. Sort by score and return top recommendations with explanation
        return bookScores.entrySet().stream()
                .sorted(Map.Entry.<Book, Double>comparingByValue().reversed())
                .limit(10)
                .map(entry -> {
                    Book book = entry.getKey();
                    com.infy.lms.dto.BookDTO dto = convertToBookDTO(book);
                    String reason = generateRecommendationReason(book, genrePreferences, tagPreferences, borrowHistory);
                    dto.setRecommendationReason(reason);
                    return dto;
                })
                .collect(Collectors.toList());
    }

    private List<BookDTO> getPopularBooks(int limit) {
        List<Book> allBooks = bookRepository.findAll();
        return allBooks.stream()
                .filter(book -> book.getAvailableCopies() > 0)
                .sorted((a, b) -> Integer.compare(
                        borrowRecordRepository.findByBookId(b.getId()).size(),
                        borrowRecordRepository.findByBookId(a.getId()).size()))
                .limit(limit)
                .map(this::convertToBookDTO)
                .collect(Collectors.toList());
    }

    private Map<String, Integer> getGenrePreferences(List<BorrowRecord> borrowHistory) {
        Map<String, Integer> genreCount = new HashMap<>();
        for (BorrowRecord record : borrowHistory) {
            String genre = record.getBook().getGenre();
            if (genre != null && !genre.trim().isEmpty()) {
                genreCount.put(genre, genreCount.getOrDefault(genre, 0) + 1);
            }
        }
        return genreCount;
    }

    private Map<String, Integer> getTagPreferences(List<BorrowRecord> borrowHistory) {
        Map<String, Integer> tagCount = new HashMap<>();
        for (BorrowRecord record : borrowHistory) {
            List<String> tags = record.getBook().tagList();
            for (String tag : tags) {
                tagCount.put(tag, tagCount.getOrDefault(tag, 0) + 1);
            }
        }
        return tagCount;
    }

    private double calculateRecommendationScore(Book book, Map<String, Integer> genrePreferences,
                                              Map<String, Integer> tagPreferences, List<BorrowRecord> borrowHistory) {
        double score = 0.0;

        // 1. Category relevance (40% weight)
        String genre = book.getGenre();
        if (genre != null && genrePreferences.containsKey(genre)) {
            int genreFrequency = genrePreferences.get(genre);
            score += genreFrequency * 0.4;
        }

        // 2. Tag relevance (30% weight)
        List<String> bookTags = book.tagList();
        int totalTagMatches = 0;
        for (String tag : bookTags) {
            if (tagPreferences.containsKey(tag)) {
                totalTagMatches += tagPreferences.get(tag);
            }
        }
        score += totalTagMatches * 0.3;

        // 3. Book popularity (20% weight) - based on how often this book has been borrowed
        List<BorrowRecord> bookBorrowHistory = borrowRecordRepository.findByBookId(book.getId());
        int popularityScore = bookBorrowHistory.size();
        score += popularityScore * 0.2;

        // 4. Availability boost (10% weight) - prefer books with higher availability
        int availabilityRatio = book.getAvailableCopies() * 100 / book.getTotalCopies();
        score += availabilityRatio * 0.1;

        return score;
    }

    private BookDTO convertToBookDTO(Book book) {
        return BookDTO.builder()
                .id(book.getId())
                .title(book.getTitle())
                .author(book.getAuthor())
                .isbn(book.getIsbn())
                .totalCopies(book.getTotalCopies())
                .availableCopies(book.getAvailableCopies())
                .issuedCopies(book.getIssuedCopies())
                .genre(book.getGenre())
                .publisher(book.getPublisher())
                .tags(book.getTags())
                .tagList(book.tagList())
                .mrp(book.getMrp())
                .createdAt(book.getCreatedAt())
                .updatedAt(book.getUpdatedAt())
                .accessLevel(book.getAccessLevel())
                .build();
    }

    private String generateRecommendationReason(Book book, Map<String, Integer> genrePreferences, Map<String, Integer> tagPreferences, List<BorrowRecord> borrowHistory) {
        List<String> parts = new ArrayList<>();
        String genre = book.getGenre();
        if (genre != null && genrePreferences.containsKey(genre)) {
            parts.add("Matches your interest in " + genre);
        }
        List<String> bookTags = book.tagList();
        List<String> matchingTags = bookTags.stream().filter(tagPreferences::containsKey).collect(Collectors.toList());
        if (!matchingTags.isEmpty()) {
            parts.add("Shared tags: " + String.join(", ", matchingTags));
        }
        // Popularity note
        int popularity = borrowRecordRepository.findByBookId(book.getId()).size();
        if (popularity > 5) {
            parts.add("Popular choice among readers");
        }
        if (parts.isEmpty()) {
            return "Recommended based on your reading patterns.";
        }
        return String.join("; ", parts);
    }

    // Analytics methods for librarian and admin
    public Map<String, Integer> getFrequentlyRecommendedBooks() {
        // This would require storing recommendation history
        // For now, return popular books as proxy
        List<Book> allBooks = bookRepository.findAll();
        return allBooks.stream()
                .collect(Collectors.toMap(
                        Book::getTitle,
                        book -> borrowRecordRepository.findByBookId(book.getId()).size()
                ));
    }

    /**
     * Aggregated popular books with filters and date range support.
     */
    public Map<String, Integer> getFrequentlyRecommendedBooks(java.time.Instant start, java.time.Instant end, String membershipType, String department, String location) {
        List<Object[]> rows = borrowRecordRepository.countBorrowsGroupedByBook(start, end, membershipType, department, location);
        Map<String, Integer> result = new LinkedHashMap<>();
        for (Object[] row : rows) {
            String title = (String) row[0];
            Number cnt = (Number) row[1];
            result.put(title, cnt == null ? 0 : cnt.intValue());
        }
        return result;
    }

    /**
     * Aggregated genre trends with filters and date range support.
     */
    public Map<String, Integer> getCategoryDemandTrends(java.time.Instant start, java.time.Instant end, String membershipType, String department, String location) {
        List<Object[]> rows = borrowRecordRepository.countBorrowsGroupedByGenre(start, end, membershipType, department, location);
        Map<String, Integer> result = new LinkedHashMap<>();
        for (Object[] row : rows) {
            String genre = (String) row[0];
            Number cnt = (Number) row[1];
            if (genre == null || genre.trim().isEmpty()) continue;
            result.put(genre, cnt == null ? 0 : cnt.intValue());
        }
        return result;
    }

    /**
     * Time-series of borrow counts per day within the given filters.
     */
    public List<java.util.Map<String, Object>> getBorrowCountsByDay(java.time.Instant start, java.time.Instant end, String membershipType, String department, String location) {
        List<Object[]> rows = borrowRecordRepository.countBorrowsByDay(start, end, membershipType, department, location);
        List<Map<String, Object>> series = new ArrayList<>();
        for (Object[] row : rows) {
            java.sql.Date day = (java.sql.Date) row[0];
            Number cnt = (Number) row[1];
            Map<String, Object> point = new HashMap<>();
            point.put("date", day.toLocalDate().toString());
            point.put("count", cnt == null ? 0 : cnt.intValue());
            series.add(point);
        }
        return series;
    }
}
