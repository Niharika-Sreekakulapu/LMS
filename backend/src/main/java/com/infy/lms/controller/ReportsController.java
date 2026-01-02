package com.infy.lms.controller;

import com.infy.lms.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportsController {

    private final ReportService reportService;

    @GetMapping("/download")
    @PreAuthorize("hasRole('ADMIN') or hasRole('LIBRARIAN')")
    public ResponseEntity<byte[]> downloadReport(
            @RequestParam String type,
            @RequestParam String format) {

        try {
            byte[] reportData;
            String filename;

            switch (type) {
                case "library-usage":
                    reportData = reportService.generateLibraryUsageReport();
                    filename = "library_usage_report.csv";
                    break;
                case "overdue-books":
                    reportData = reportService.generateOverdueBooksReport();
                    filename = "overdue_books_report.csv";
                    break;
                case "fines-payments":
                    reportData = reportService.generateFinesPaymentsReport();
                    filename = "fines_payments_report.csv";
                    break;
                case "popular-books":
                    reportData = reportService.generatePopularBooksReport();
                    filename = "popular_books_report.csv";
                    break;
                default:
                    return ResponseEntity.badRequest().build();
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("text/csv"));
            headers.setContentDispositionFormData("attachment", filename);
            headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(reportData);

        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
