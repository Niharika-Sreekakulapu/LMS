package com.infy.lms.controller;

import com.infy.lms.dto.BookDTO;
import com.infy.lms.service.RecommendationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/recommendations")
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationService recommendationService;

    @GetMapping("/{userId}")
    @PreAuthorize("hasRole('STUDENT') or hasRole('LIBRARIAN') or hasRole('ADMIN')")
    public ResponseEntity<List<BookDTO>> getRecommendations(@PathVariable Long userId) {
        List<BookDTO> recommendations = recommendationService.getRecommendationsForUser(userId);
        return ResponseEntity.ok(recommendations);
    }

    // Librarian and Admin endpoints for insights
    @GetMapping("/analytics/popular-books")
    @PreAuthorize("hasRole('LIBRARIAN') or hasRole('ADMIN')")
    public ResponseEntity<Map<String, Integer>> getPopularBooks(
            @RequestParam(required = false) String since,
            @RequestParam(required = false) String until,
            @RequestParam(required = false) String membershipType,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String location
    ) {
        // Parse optional date strings (expected format: YYYY-MM-DD)
        java.time.Instant start = null;
        java.time.Instant end = null;
        try {
            if (since != null && !since.isBlank()) {
                java.time.LocalDate s = java.time.LocalDate.parse(since);
                start = s.atStartOfDay(java.time.ZoneOffset.UTC).toInstant();
            }
            if (until != null && !until.isBlank()) {
                java.time.LocalDate u = java.time.LocalDate.parse(until);
                end = u.plusDays(1).atStartOfDay(java.time.ZoneOffset.UTC).toInstant().minusSeconds(1);
            }
        } catch (Exception e) {
            throw new RuntimeException("Invalid date format. Use YYYY-MM-DD");
        }

        Map<String, Integer> popularBooks = recommendationService.getFrequentlyRecommendedBooks(start, end, membershipType, department, location);
        return ResponseEntity.ok(popularBooks);
    }

    @GetMapping("/analytics/category-trends")
    @PreAuthorize("hasRole('LIBRARIAN') or hasRole('ADMIN')")
    public ResponseEntity<Map<String, Integer>> getCategoryTrends(
            @RequestParam(required = false) String since,
            @RequestParam(required = false) String until,
            @RequestParam(required = false) String membershipType,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String location
    ) {
        java.time.Instant start = null;
        java.time.Instant end = null;
        try {
            if (since != null && !since.isBlank()) {
                java.time.LocalDate s = java.time.LocalDate.parse(since);
                start = s.atStartOfDay(java.time.ZoneOffset.UTC).toInstant();
            }
            if (until != null && !until.isBlank()) {
                java.time.LocalDate u = java.time.LocalDate.parse(until);
                end = u.plusDays(1).atStartOfDay(java.time.ZoneOffset.UTC).toInstant().minusSeconds(1);
            }
        } catch (Exception e) {
            throw new RuntimeException("Invalid date format. Use YYYY-MM-DD");
        }

        Map<String, Integer> categoryTrends = recommendationService.getCategoryDemandTrends(start, end, membershipType, department, location);
        return ResponseEntity.ok(categoryTrends);
    }

    @GetMapping("/analytics/popular-books/timeseries")
    @PreAuthorize("hasRole('LIBRARIAN') or hasRole('ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getPopularBooksTimeSeries(
            @RequestParam(required = false) String since,
            @RequestParam(required = false) String until,
            @RequestParam(required = false) String membershipType,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String location
    ) {
        java.time.Instant start = null;
        java.time.Instant end = null;
        try {
            if (since != null && !since.isBlank()) {
                java.time.LocalDate s = java.time.LocalDate.parse(since);
                start = s.atStartOfDay(java.time.ZoneOffset.UTC).toInstant();
            }
            if (until != null && !until.isBlank()) {
                java.time.LocalDate u = java.time.LocalDate.parse(until);
                end = u.plusDays(1).atStartOfDay(java.time.ZoneOffset.UTC).toInstant().minusSeconds(1);
            }
        } catch (Exception e) {
            throw new RuntimeException("Invalid date format. Use YYYY-MM-DD");
        }

        List<Map<String, Object>> series = recommendationService.getBorrowCountsByDay(start, end, membershipType, department, location);
        return ResponseEntity.ok(series);
    }

    @GetMapping("/analytics/popular-books/export")
    @PreAuthorize("hasRole('LIBRARIAN') or hasRole('ADMIN')")
    public ResponseEntity<byte[]> exportPopularBooks(
            @RequestParam(required = false) String since,
            @RequestParam(required = false) String until,
            @RequestParam(required = false) String membershipType,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String location
    ) {
        java.time.Instant start = null;
        java.time.Instant end = null;
        try {
            if (since != null && !since.isBlank()) {
                java.time.LocalDate s = java.time.LocalDate.parse(since);
                start = s.atStartOfDay(java.time.ZoneOffset.UTC).toInstant();
            }
            if (until != null && !until.isBlank()) {
                java.time.LocalDate u = java.time.LocalDate.parse(until);
                end = u.plusDays(1).atStartOfDay(java.time.ZoneOffset.UTC).toInstant().minusSeconds(1);
            }
        } catch (Exception e) {
            throw new RuntimeException("Invalid date format. Use YYYY-MM-DD");
        }

        Map<String, Integer> data = recommendationService.getFrequentlyRecommendedBooks(start, end, membershipType, department, location);
        StringBuilder csv = new StringBuilder();
        csv.append("Title,Count\n");
        for (Map.Entry<String, Integer> e : data.entrySet()) {
            csv.append('"').append(e.getKey().replaceAll("\"", "\"\"" )).append('"').append(',').append(e.getValue()).append("\n");
        }
        byte[] bytes = csv.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.add(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=popular_books.csv");
        headers.add(org.springframework.http.HttpHeaders.CONTENT_TYPE, "text/csv; charset=utf-8");
        return org.springframework.http.ResponseEntity.ok().headers(headers).body(bytes);
    }
}
