package com.infy.lms.service;

import com.infy.lms.dto.AcquisitionRequestCreateDto;
import com.infy.lms.dto.AcquisitionRequestResponseDto;
import com.infy.lms.model.AcquisitionRequest;
import com.infy.lms.repository.AcquisitionRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;
import com.infy.lms.model.Book;                // your existing Book entity
import com.infy.lms.model.User;
import com.infy.lms.model.BookRequest;
import com.infy.lms.repository.BookRepository;
import com.infy.lms.repository.UserRepository;
import com.infy.lms.repository.BookRequestRepository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.time.LocalDate;


@Service
@RequiredArgsConstructor
public class AcquisitionRequestService {

    private final AcquisitionRequestRepository repository;
    private final AcquisitionRequestRepository acqRepo;
    private final BookRequestRepository bookReqRepo; // for checking monthly limits
    private final BookRepository bookRepo;       // assume exists
    private final UserRepository userRepo;
    private final EmailService emailService;     // will be provided below or reuse yours

    @Transactional
    public AcquisitionRequestResponseDto create(Long studentId, AcquisitionRequestCreateDto dto) {

        // Log raw request data
        System.out.println("=== ACQUISITION REQUEST SUBMISSION ===");
        System.out.println("Raw DTO - bookName: '" + dto.getBookName() +
                         "', author: '" + dto.getAuthor() +
                         "', publisher: '" + dto.getPublisher() +
                         "', version: '" + dto.getVersion() +
                         "', genre: '" + dto.getGenre() +
                         "', justification: '" + dto.getJustification() + "'");

        // Check if a book with same name, author, and publisher already exists
        if (dto.getBookName() != null && !dto.getBookName().trim().isEmpty()) {
            String author = dto.getAuthor() != null && !dto.getAuthor().trim().isEmpty() ? dto.getAuthor().trim() : null;
            String publisher = dto.getPublisher() != null && !dto.getPublisher().trim().isEmpty() ? dto.getPublisher().trim() : null;

            System.out.println("Processed values - title='" + dto.getBookName().trim() +
                             "', author='" + (author != null ? author : "NULL") +
                             "', publisher='" + (publisher != null ? publisher : "NULL") + "'");

            // Debug: Check all books with matching title
            List<Book> booksWithSameTitle = bookRepo.findByTitleIgnoreCase(dto.getBookName().trim());
            System.out.println("=== BOOKS WITH MATCHING TITLE (" + booksWithSameTitle.size() + " found) ===");
            for (Book b : booksWithSameTitle) {
                System.out.println("  ID: " + b.getId() +
                                 ", Title: '" + b.getTitle() + "' (raw: '" + b.getTitle() + "')" +
                                 ", Author: '" + (b.getAuthor() != null ? b.getAuthor() : "NULL") + "' (raw: '" + (b.getAuthor() != null ? b.getAuthor() : "NULL") + "')" +
                                 ", Publisher: '" + (b.getPublisher() != null ? b.getPublisher() : "NULL") + "' (raw: '" + (b.getPublisher() != null ? b.getPublisher() : "NULL") + "')");
            }

            List<Book> exactMatches = bookRepo.findExactMatches(
                dto.getBookName().trim(),
                author,
                publisher
            );

            System.out.println("=== EXACT MATCHES (" + exactMatches.size() + " found) ===");
            for (Book match : exactMatches) {
                System.out.println("  MATCH - ID: " + match.getId() + ", Title: '" + match.getTitle() +
                                 "', Author: '" + (match.getAuthor() != null ? match.getAuthor() : "NULL") +
                                 "', Publisher: '" + (match.getPublisher() != null ? match.getPublisher() : "NULL") + "'");
            }

            if (!exactMatches.isEmpty()) {
                System.out.println("❌ DUPLICATE BOOK DETECTED - BLOCKING REQUEST");
                throw new IllegalStateException("Book already exists in the library collection");
            } else {
                System.out.println("✅ NO DUPLICATES FOUND - ALLOWING REQUEST");
            }
        } else {
            System.out.println("Book name is empty or null, skipping duplicate check");
        }

        // Combine genre and justification for storage since genre field doesn't exist in DB
        String combinedJustification = "";
        if (dto.getGenre() != null && !dto.getGenre().trim().isEmpty()) {
            combinedJustification += "Genre: " + dto.getGenre().trim();
        }
        if (dto.getJustification() != null && !dto.getJustification().trim().isEmpty()) {
            if (!combinedJustification.isEmpty()) {
                combinedJustification += "\n\n";
            }
            combinedJustification += dto.getJustification().trim();
        }

        AcquisitionRequest ar = AcquisitionRequest.builder()
                .studentId(studentId)
                .bookName(dto.getBookName())
                .author(dto.getAuthor())
                .publisher(dto.getPublisher())
                .version(dto.getVersion()) // Map version (string) to version field
                .genre(dto.getGenre()) // Set genre field
                .justification(dto.getJustification()) // Keep original justification separate
                .status(AcquisitionRequest.Status.PENDING)
                .build();

        ar = repository.save(ar);
        return toDto(ar);
    }

    @Transactional(readOnly = true)
    public List<AcquisitionRequestResponseDto> findByStudent(Long studentId) {
        return repository.findByStudentId(studentId)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AcquisitionRequestResponseDto> findByStatus(AcquisitionRequest.Status status) {
        List<AcquisitionRequest> requests;
        if (status == null) {
            // Return all requests when status is null (for "ALL" filter)
            requests = repository.findAll();
        } else {
            requests = repository.findByStatus(status);
        }
        return requests.stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }


    @Transactional
    public AcquisitionRequestResponseDto approve(Long requestId, Long reviewerId) {
        AcquisitionRequest ar = acqRepo.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Acquisition request not found: " + requestId));

        if (ar.getStatus() != AcquisitionRequest.Status.PENDING) {
            throw new IllegalStateException("Request is not pending and cannot be approved");
        }

        // Check if book already exists, if so increment copies, otherwise create new
        String author = ar.getAuthor() != null && !ar.getAuthor().trim().isEmpty() ? ar.getAuthor().trim() : null;
        String publisher = ar.getPublisher() != null && !ar.getPublisher().trim().isEmpty() ? ar.getPublisher().trim() : null;

        List<Book> existingBooks = bookRepo.findExactMatches(ar.getBookName().trim(), author, publisher);

        Book book;
        if (!existingBooks.isEmpty()) {
            // Book exists, increment copies
            book = existingBooks.get(0); // Take the first match
            book.setTotalCopies(book.getTotalCopies() + 1);
            book.setAvailableCopies(book.getAvailableCopies() + 1);
            System.out.println("Incrementing copies of existing book ID: " + book.getId() +
                             ", new total copies: " + book.getTotalCopies());
        } else {
            // Book doesn't exist, create new one
            System.out.println("Creating new book for approved acquisition request");
            book = Book.builder()
                    .title(ar.getBookName())
                    .author(ar.getAuthor())
                    .publisher(ar.getPublisher())
                    .isbn(null)                        // or ar.getIsbn() if provided
                    .totalCopies(1)                    // required - set sensible default
                    .availableCopies(1)                // required - make available match total by default
                    .issuedCopies(0)                   // required - zero at creation
                    .genre(ar.getGenre())              // Set genre from acquisition request
                    .accessLevel("NORMAL")             // Default new books to NORMAL (uppercase for consistency)
                    .build();
        }

        book = bookRepo.save(book);


        // mark request approved
        ar.setStatus(AcquisitionRequest.Status.APPROVED);
        ar.setReviewedBy(reviewerId);
        ar.setReviewedAt(LocalDateTime.now());
        acqRepo.save(ar);

        // notify student via email
        Optional<User> studentOpt = userRepo.findById(ar.getStudentId());
        Book finalBook = book;
        studentOpt.ifPresent(student -> {
            String to = student.getEmail();
            String subject = "Your book request has been approved";
            String htmlBody = "<html><head><style>" +
                    "body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f9f9f9; }" +
                    ".container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); overflow: hidden; }" +
                    ".header { background: linear-gradient(135deg, #28a745, #20c997); color: white; padding: 30px 40px; text-align: center; }" +
                    ".header h1 { margin: 0; font-size: 28px; font-weight: 700; }" +
                    ".content { padding: 40px; }" +
                    ".content h2 { color: #28a745; margin-top: 0; font-size: 24px; }" +
                    ".content p { line-height: 1.6; color: #555; margin: 15px 0; }" +
                    ".highlight { background: #e8f5e8; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; border-radius: 4px; }" +
                    ".footer { background: #f8f9fa; padding: 20px 40px; text-align: center; color: #666; font-size: 14px; border-top: 1px solid #e9ecef; }" +
                    ".footer p { margin: 5px 0; }" +
                    "</style></head><body>" +
                    "<div class='container'>" +
                    "<div class='header'>" +
                    "<h1>🎉 Good News!</h1>" +
                    "</div>" +
                    "<div class='content'>" +
                    "<h2>Your Book Request Has Been Approved!</h2>" +
                    "<p>Dear " + (student.getName() == null ? "Valued Student" : student.getName()) + ",</p>" +
                    "<p>We're excited to inform you that your acquisition request has been <strong style='color: #28a745;'>APPROVED</strong>!</p>" +
                    "<div class='highlight'>" +
                    "<strong>📖 Book Details:</strong><br>" +
                    "Title: <strong>" + ar.getBookName() + "</strong><br>" +
                    "Author: <strong>" + (ar.getAuthor() != null ? ar.getAuthor() : "N/A") + "</strong><br>" +
                    "Book ID: <strong>" + finalBook.getId() + "</strong>" +
                    "</div>" +
                    "<p>The book has been added to our library collection and is now available for you to borrow. You can request this book from our catalog whenever you'd like.</p>" +
                    "<p style='margin-top: 25px;'><strong>Happy Reading!</strong></p>" +
                    "<p>Best regards,<br><strong>Library Management Team</strong></p>" +
                    "</div>" +
                    "<div class='footer'>" +
                    "<p><strong>Library Management System</strong></p>" +
                    "<p>This is an automated notification • Please do not reply to this email</p>" +
                    "<p>© 2025 Library Management System. All rights reserved.</p>" +
                    "</div>" +
                    "</div></body></html>";
            emailService.sendEmail(to, subject, htmlBody);
        });

        return toDto(ar);
    }

    @Transactional
    public AcquisitionRequestResponseDto reject(Long requestId, Long reviewerId, String reason) {
        AcquisitionRequest ar = acqRepo.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Acquisition request not found: " + requestId));

        if (ar.getStatus() != AcquisitionRequest.Status.PENDING) {
            throw new IllegalStateException("Request is not pending and cannot be rejected");
        }

        ar.setStatus(AcquisitionRequest.Status.REJECTED);
        ar.setReviewedBy(reviewerId);
        ar.setReviewedAt(LocalDateTime.now());
        ar.setRejectionReason(reason);
        acqRepo.save(ar);

        // notify student via email
        userRepo.findById(ar.getStudentId()).ifPresent(student -> {
            String to = student.getEmail();
            String subject = "Your book request was rejected";
            String htmlBody = "<html><head><style>" +
                    "body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f9f9f9; }" +
                    ".container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); overflow: hidden; }" +
                    ".header { background: linear-gradient(135deg, #dc3545, #c82333); color: white; padding: 30px 40px; text-align: center; }" +
                    ".header h1 { margin: 0; font-size: 28px; font-weight: 700; }" +
                    ".content { padding: 40px; }" +
                    ".content h2 { color: #dc3545; margin-top: 0; font-size: 24px; }" +
                    ".content p { line-height: 1.6; color: #555; margin: 15px 0; }" +
                    ".highlight { background: #ffebee; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; border-radius: 4px; }" +
                    ".reason { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px 0; border-radius: 4px; }" +
                    ".footer { background: #f8f9fa; padding: 20px 40px; text-align: center; color: #666; font-size: 14px; border-top: 1px solid #e9ecef; }" +
                    ".footer p { margin: 5px 0; }" +
                    "</style></head><body>" +
                    "<div class='container'>" +
                    "<div class='header'>" +
                    "<h1>📋 Request Update</h1>" +
                    "</div>" +
                    "<div class='content'>" +
                    "<h2>Your Book Request Has Been Reviewed</h2>" +
                    "<p>Dear " + (student.getName() == null ? "Valued Student" : student.getName()) + ",</p>" +
                    "<p>After careful consideration, your acquisition request has been <strong style='color: #dc3545;'>REJECTED</strong>.</p>" +
                    "<div class='highlight'>" +
                    "<strong>📖 Book Details:</strong><br>" +
                    "Title: <strong>" + ar.getBookName() + "</strong><br>" +
                    "Author: <strong>" + (ar.getAuthor() != null ? ar.getAuthor() : "N/A") + "</strong>" +
                    "</div>" +
                    "<div class='reason'>" +
                    "<strong>Reason for Rejection:</strong><br>" +
                    (reason == null || reason.trim().isEmpty() ? "No specific reason provided by the reviewer." : reason) +
                    "</div>" +
                    "<p>We understand this may be disappointing. You can submit a new request with different justification or try requesting a different book that may be more suitable for our collection.</p>" +
                    "<p>If you have questions about this decision, please contact library staff for more information.</p>" +
                    "<p>Thank you for your interest in expanding our library collection.</p>" +
                    "<p>Best regards,<br><strong>Library Management Team</strong></p>" +
                    "</div>" +
                    "<div class='footer'>" +
                    "<p><strong>Library Management System</strong></p>" +
                    "<p>This is an automated notification • Please do not reply to this email</p>" +
                    "<p>© 2025 Library Management System. All rights reserved.</p>" +
                    "</div>" +
                    "</div></body></html>";
            emailService.sendEmail(to, subject, htmlBody);
        });

        return toDto(ar);
    }

    // Check if student has reached the monthly limit of 3 requests across all request types
    private void checkMonthlyLimit(Long studentId) {
        // Get the first and last day of current month
        LocalDate now = LocalDate.now();
        LocalDate startOfMonth = now.withDayOfMonth(1);
        LocalDate endOfMonth = now.withDayOfMonth(now.lengthOfMonth());

        LocalDateTime startDateTime = startOfMonth.atStartOfDay();
        LocalDateTime endDateTime = endOfMonth.atTime(23, 59, 59, 999999);

        System.out.println("Checking monthly limit for student " + studentId + " from " + startDateTime + " to " + endDateTime);

        // Count acquisition requests in current month (PENDING/REJECTED/APPROVED all count)
        List<AcquisitionRequest> acqRequests = repository.findByStudentIdAndCreatedAtBetween(
                studentId, startDateTime, endDateTime);
        System.out.println("Acquisition requests this month: " + acqRequests.size());

        // Count book requests in current month (PENDING/REJECTED/APPROVED all count)
        User user = userRepo.findById(studentId)
                .orElseThrow(() -> new IllegalArgumentException("Student not found: " + studentId));
        List<BookRequest> bookRequests = bookReqRepo.findByStudentAndRequestedAtBetween(
                user, startDateTime.toInstant(java.time.ZoneOffset.UTC), endDateTime.toInstant(java.time.ZoneOffset.UTC));
        System.out.println("Book requests this month: " + bookRequests.size());

        int totalRequests = acqRequests.size() + bookRequests.size();
        System.out.println("Total requests this month: " + totalRequests + " (limit is 3)");

        if (totalRequests >= 3) {
            String message = String.format("Monthly request limit exceeded. You have made %d book requests this month. Maximum allowed is 3 requests per month.",
                    totalRequests);
            System.out.println("❌ " + message);
            throw new IllegalStateException(message);
        }

        System.out.println("✅ Monthly limit check passed");
    }

    // reuse your existing toDto(...) method
    private AcquisitionRequestResponseDto toDto(AcquisitionRequest ar) {
        return AcquisitionRequestResponseDto.builder()
                .id(ar.getId())
                .studentId(ar.getStudentId())
                .bookName(ar.getBookName())
                .author(ar.getAuthor())
                .publisher(ar.getPublisher())
                .edition(ar.getVersion())
                .genre(ar.getGenre())
                .justification(ar.getJustification())
                .status(ar.getStatus())
                .reviewedBy(ar.getReviewedBy())
                .reviewedAt(ar.getReviewedAt())
                .rejectionReason(ar.getRejectionReason())
                .createdAt(ar.getCreatedAt())
                .updatedAt(ar.getUpdatedAt())
                .build();
    }
}
