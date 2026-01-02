package com.infy.lms.service.impl;

import com.infy.lms.dto.BookRequestResponseDTO;
import com.infy.lms.dto.BorrowRequestDTO;
import com.infy.lms.dto.CreateBookRequestDTO;
import com.infy.lms.dto.PageDTO;
import com.infy.lms.exception.BadRequestException;
import com.infy.lms.exception.NotFoundException;
import com.infy.lms.exception.OutOfStockException;
import com.infy.lms.model.*;
import com.infy.lms.repository.AcquisitionRequestRepository;
import com.infy.lms.repository.BookRepository;
import com.infy.lms.repository.BookRequestRepository;
import com.infy.lms.repository.BorrowRecordRepository;
import com.infy.lms.repository.UserRepository;
import com.infy.lms.service.BookRequestService;
import com.infy.lms.service.BorrowService;
import com.infy.lms.service.EmailService;
import com.infy.lms.service.SubscriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
@RequiredArgsConstructor
public class BookRequestServiceImpl implements BookRequestService {

    private final BookRequestRepository requestRepo;
    private final AcquisitionRequestRepository acqRequestRepo;
    private final BorrowRecordRepository borrowRecordRepo;
    private final UserRepository userRepo;
    private final BorrowService borrowService;
    private final BookRepository bookRepo;
    private final EmailService emailService;
    private final SubscriptionService subscriptionService;
    private static final Logger log = LoggerFactory.getLogger(BookRequestServiceImpl.class);

    @Override
    public BookRequestResponseDTO createRequest(Long studentId, CreateBookRequestDTO body) {
        try {
            System.out.println("🚀 BOOK REQUEST: Starting request for student=" + studentId + ", book=" + body.getBookId());

            User student = userRepo.findById(studentId)
                    .orElseThrow(() -> new NotFoundException("User not found"));
            System.out.println("👤 USER FOUND: " + student.getEmail() + ", MembershipType=" + student.getMembershipType());

            Book book = bookRepo.findById(body.getBookId())
                    .orElseThrow(() -> new NotFoundException("Book not found"));
            System.out.println("📖 BOOK FOUND: " + book.getTitle() + ", AccessLevel=" + book.getAccessLevel());

            // Check if non-premium user is trying to request premium book
            checkPremiumBookAccess(student, book);

            // Check monthly request limit (3 requests per month across all request types)
            checkMonthlyLimit(studentId);

            // Check if student has active requests for this book (PENDING)
            List<BookRequest> pendingRequests = requestRepo.findByStudentIdAndBookIdAndStatusIn(
                studentId, book.getId(), List.of(RequestStatus.PENDING));
            System.out.println("🔍 PENDING REQUESTS for book " + book.getId() + ": " + pendingRequests.size());
            if (!pendingRequests.isEmpty()) {
                throw new BadRequestException("You have already requested this book and it is still being processed");
            }

            // Check if student has approved requests for this book that are still active (not returned)
            List<BookRequest> approvedRequests = requestRepo.findByStudentIdAndBookIdAndStatusIn(
                studentId, book.getId(), List.of(RequestStatus.APPROVED));
            System.out.println("🔍 APPROVED REQUESTS for book " + book.getId() + ": " + approvedRequests.size());
            for (BookRequest request : approvedRequests) {
                if (request.getIssuedRecordId() != null) {
                    // Check if this borrow is still active (not returned)
                    boolean hasActiveBorrowForRequest = borrowRecordRepo.findById(request.getIssuedRecordId())
                        .map(borrow -> {
                            boolean isActive = borrow.getReturnedAt() == null;
                            System.out.println("🔍 Borrow record " + request.getIssuedRecordId() + " is active: " + isActive + " (returnedAt: " + borrow.getReturnedAt() + ")");
                            return isActive;
                        })
                        .orElse(false);
                    if (hasActiveBorrowForRequest) {
                        throw new BadRequestException("You have already requested this book and it is still being processed");
                    }
                } else {
                    System.out.println("🔍 Approved request has no issuedRecordId");
                }
            }

            // Check if student currently has this book borrowed (active borrow)
            List<BorrowRecord> activeBorrows = borrowRecordRepo.findByStudentAndReturnedAtIsNull(student);
            System.out.println("🔍 ACTIVE BORROWS for student: " + activeBorrows.size());
            boolean hasActiveBorrow = activeBorrows.stream()
                .anyMatch(borrow -> {
                    boolean match = borrow.getBook().getId().equals(book.getId());
                    System.out.println("🔍 Borrow record " + borrow.getId() + " matches book: " + match + " (bookId: " + borrow.getBook().getId() + ")");
                    return match;
                });
            if (hasActiveBorrow) {
                throw new BadRequestException("You already have this book borrowed. Please return it first.");
            }

            BookRequest r = new BookRequest();
            r.setStudent(student);
            r.setBook(book);
            r.setRequestedAt(Instant.now());
            r.setStatus(RequestStatus.PENDING);

            requestRepo.save(r);
            return toDto(r);
        } catch (Exception e) {
            System.out.println("❌ ERROR IN BOOK REQUEST: " + e.getMessage());
            throw e;
        }
    }

    @Override
    public List<BookRequestResponseDTO> listRequests() {
        return requestRepo.findAllWithDetails().stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    public List<BookRequestResponseDTO> listRequestsByStatus(String status) {
        RequestStatus rs = RequestStatus.valueOf(status);
        List<BookRequest> requests = requestRepo.findByStatusWithDetails(rs);
        log.debug("Found {} requests with status {}", requests.size(), status);
        for (BookRequest req : requests) {
            if (req.getBook() == null) {
                log.warn("Request {} has null book relationship", req.getId());
            }
            if (req.getStudent() == null) {
                log.warn("Request {} has null student relationship", req.getId());
            }
        }
        return requests.stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    public PageDTO<BookRequestResponseDTO> listRequestsPaginated(Pageable pageable) {
        // TODO: Implement JOIN FETCH for paginated queries if performance becomes an issue
        Page<BookRequest> page = requestRepo.findAll(pageable);
        return toPageDto(page);
    }

    @Override
    public PageDTO<BookRequestResponseDTO> listRequestsByStatusPaginated(String status, Pageable pageable) {
        RequestStatus rs = RequestStatus.valueOf(status);
        Page<BookRequest> page = requestRepo.findByStatusWithDetailsPaginated(rs, pageable);
        return toPageDto(page);
    }

    @Override
    public List<BookRequestResponseDTO> listRequestsByStudent(Long studentId) {
        return requestRepo.findByStudentId(studentId).stream()
                .map(this::toDto)
                .toList();
    }

    /**
     * Get monthly request statistics for a student
     * This is a helper method accessible to controllers but not part of the interface
     */
    public int getMonthlyRequestCount(Long studentId) {
        // Get the first and last day of current month
        LocalDate now = LocalDate.now();
        LocalDate startOfMonth = now.withDayOfMonth(1);
        LocalDate endOfMonth = now.withDayOfMonth(now.lengthOfMonth());

        LocalDateTime startDateTime = startOfMonth.atStartOfDay();
        LocalDateTime endDateTime = endOfMonth.atTime(23, 59, 59, 999999);

        // Count book requests in current month (PENDING/REJECTED/APPROVED all count)
        User user = userRepo.findById(studentId)
                .orElseThrow(() -> new NotFoundException("Student not found"));
        List<BookRequest> bookRequests = requestRepo.findByStudentAndRequestedAtBetween(
                user, startDateTime.toInstant(java.time.ZoneOffset.UTC), endDateTime.toInstant(java.time.ZoneOffset.UTC));

        return bookRequests.size();
    }

    /**
     * Approve a BookRequest and create the BorrowRecord (issue).
     *
     * Implementation notes / assumptions:
     * - Uses BookRepository.decrementAvailableAndIncrementIssuedIfAvailable(id) atomic update to avoid race windows.
     * - This method is @Transactional: if borrowService.borrowBook(...) throws, the update will be rolled back.
     * - Ensure borrowService.borrowBook(...) does NOT itself perform another inventory decrement (or you'll double-decrement).
     */
    @Override
    @Transactional
    public BookRequestResponseDTO approveRequest(Long requestId, Long processedById) {
        return approveRequest(requestId, processedById, null);
    }

    @Transactional
    public BookRequestResponseDTO approveRequest(Long requestId, Long processedById, java.time.LocalDate customDueDate) {

        BookRequest req = requestRepo.findById(requestId)
                .orElseThrow(() -> new NotFoundException("Request not found"));

        if (req.getStatus() != RequestStatus.PENDING) {
            throw new BadRequestException("Request already processed");
        }

        Long bookId = req.getBook().getId();

        // Atomic decrement+issued increment. Returns 1 if update succeeded; 0 if no available copies.
        int updated = bookRepo.decrementAvailableAndIncrementIssuedIfAvailable(bookId);
        if (updated == 0) {
            throw new OutOfStockException("Book unavailable");
        }

        Instant dueDate;
        if (customDueDate != null) {
            // Use custom due date set by librarian/admin
            System.out.println("CUSTOM DUE DATE: Librarian/admin set due date to " + customDueDate);
            dueDate = customDueDate.atStartOfDay(java.time.ZoneId.systemDefault()).toInstant();
        } else {
            // Calculate due date based on user membership type
            int loanDays = subscriptionService.isUserPremium(req.getStudent().getId()) ? 30 : 14; // Premium: 30 days, Normal: 14 days
            System.out.println("AUTO DUE DATE: Student=" + req.getStudent().getId() + ", Premium=" + subscriptionService.isUserPremium(req.getStudent().getId()) + ", Loan Days=" + loanDays);
            dueDate = Instant.now().plus(java.time.Duration.ofDays(loanDays));
        }

        // Build borrow request DTO with calculated due date (the service should create the BorrowRecord; must NOT decrement inventory again)
        BorrowRequestDTO borrowReq = new BorrowRequestDTO();
        borrowReq.setBookId(bookId);
        borrowReq.setStudentId(req.getStudent().getId());
        borrowReq.setIssueDate(Instant.now());
        borrowReq.setDueDate(dueDate);

        // This should participate in the same transaction so errors roll everything back.
        BorrowRecord createdRecord = borrowService.borrowBook(borrowReq);

        // Link created record to the request
        req.setIssuedRecordId(createdRecord.getId());
        req.setStatus(RequestStatus.APPROVED);
        req.setProcessedAt(Instant.now());
        if (processedById != null) {
            userRepo.findById(processedById).ifPresent(req::setProcessedBy);
        }

        requestRepo.saveAndFlush(req);
        log.info("Approved request {} -> created borrow {}, saved request issued_record_id={}",
                req.getId(), createdRecord.getId(), req.getIssuedRecordId());

        // Send email notification to student
        sendApprovalEmail(req, createdRecord);

        return toDto(req);
    }

    @Override
    @Transactional
    public BookRequestResponseDTO rejectRequest(Long requestId, Long processedById, String reason) {
        BookRequest req = requestRepo.findById(requestId)
                .orElseThrow(() -> new NotFoundException("Request not found"));

        if (req.getStatus() != RequestStatus.PENDING) {
            throw new BadRequestException("Request already processed");
        }

    req.setStatus(RequestStatus.REJECTED);
    req.setReason(reason);
    req.setProcessedAt(Instant.now());

    if (processedById != null) {
        userRepo.findById(processedById).ifPresent(req::setProcessedBy);
    }

    requestRepo.save(req);

    // Send email notification to student about rejection
    sendRejectionEmail(req);

    return toDto(req);
    }

    /**
     * Bulk approve multiple book requests.
     * This method processes multiple requests and handles failures gracefully,
     * attempting to approve as many as possible.
     */
    @Override
    @Transactional
    public com.infy.lms.dto.BulkApprovalResponseDTO bulkApproveRequests(List<Long> requestIds, Long processedBy) {
        log.info("Starting bulk approval of {} requests by user {}", requestIds.size(), processedBy);

        int approvedCount = 0;
        java.util.List<com.infy.lms.dto.BulkApprovalResponseDTO.FailedRequestDTO> failedRequests = new java.util.ArrayList<>();

        for (Long requestId : requestIds) {
            try {
                BookRequest req = requestRepo.findById(requestId)
                    .orElseThrow(() -> new NotFoundException("Request not found: " + requestId));

                if (req.getStatus() != RequestStatus.PENDING) {
                    failedRequests.add(com.infy.lms.dto.BulkApprovalResponseDTO.FailedRequestDTO.builder()
                        .id(requestId)
                        .reason("Request already processed: " + req.getStatus())
                        .build());
                    continue;
                }

                Long bookId = req.getBook().getId();

                // Atomic decrement+issued increment. Returns 1 if update succeeded; 0 if no available copies.
                int updated = bookRepo.decrementAvailableAndIncrementIssuedIfAvailable(bookId);
                if (updated == 0) {
                    failedRequests.add(com.infy.lms.dto.BulkApprovalResponseDTO.FailedRequestDTO.builder()
                        .id(requestId)
                        .reason("Book unavailable: " + req.getBook().getTitle())
                        .build());
                    continue;
                }

                // Calculate due date based on user membership type
                int loanDays = subscriptionService.isUserPremium(req.getStudent().getId()) ? 30 : 14;
                Instant dueDate = Instant.now().plus(java.time.Duration.ofDays(loanDays));

                // Build borrow request DTO with calculated due date
                BorrowRequestDTO borrowReq = new BorrowRequestDTO();
                borrowReq.setBookId(bookId);
                borrowReq.setStudentId(req.getStudent().getId());
                borrowReq.setIssueDate(Instant.now());
                borrowReq.setDueDate(dueDate);

                // Create the borrow record
                BorrowRecord createdRecord = borrowService.borrowBook(borrowReq);

                // Link created record to the request
                req.setIssuedRecordId(createdRecord.getId());
                req.setStatus(RequestStatus.APPROVED);
                req.setProcessedAt(Instant.now());
                if (processedBy != null) {
                    userRepo.findById(processedBy).ifPresent(req::setProcessedBy);
                }

                requestRepo.saveAndFlush(req);
                approvedCount++;

                // Send email notification to student
                sendApprovalEmail(req, createdRecord);

                log.info("Approved request {} -> created borrow {}", req.getId(), createdRecord.getId());

            } catch (Exception e) {
                log.error("Failed to approve request {}: {}", requestId, e.getMessage());
                failedRequests.add(com.infy.lms.dto.BulkApprovalResponseDTO.FailedRequestDTO.builder()
                    .id(requestId)
                    .reason("Error: " + e.getMessage())
                    .build());
            }
        }

        com.infy.lms.dto.BulkApprovalResponseDTO response = com.infy.lms.dto.BulkApprovalResponseDTO.builder()
            .approvedCount(approvedCount)
            .failedCount(failedRequests.size())
            .failedRequests(failedRequests)
            .build();

        log.info("Bulk approval completed: {} approved, {} failed out of {} total",
            approvedCount, failedRequests.size(), requestIds.size());

        return response;
    }

    // Check if student has reached the monthly limit of 3 BOOK requests per month
    private void checkMonthlyLimit(Long studentId) {
        // Check if user is premium - if yes, skip monthly limit check
        if (subscriptionService.isUserPremium(studentId)) {
            System.out.println("✅ Premium user " + studentId + " - skipping monthly limit check");
            return;
        }

        // Get the first and last day of current month
        LocalDate now = LocalDate.now();
        LocalDate startOfMonth = now.withDayOfMonth(1);
        LocalDate endOfMonth = now.withDayOfMonth(now.lengthOfMonth());

        LocalDateTime startDateTime = startOfMonth.atStartOfDay();
        LocalDateTime endDateTime = endOfMonth.atTime(23, 59, 59, 999999);

        System.out.println("Checking monthly limit for student " + studentId + " from " + startDateTime + " to " + endDateTime);

        // Count book requests in current month (PENDING/REJECTED/APPROVED all count)
        User user = userRepo.findById(studentId)
                .orElseThrow(() -> new NotFoundException("Student not found"));
        List<BookRequest> bookRequests = requestRepo.findByStudentAndRequestedAtBetween(
                user, startDateTime.toInstant(java.time.ZoneOffset.UTC), endDateTime.toInstant(java.time.ZoneOffset.UTC));
        System.out.println("Book requests this month: " + bookRequests.size());

        int totalBookRequests = bookRequests.size();
        System.out.println("Total book requests this month: " + totalBookRequests + " (limit is 3)");

        if (totalBookRequests >= 3) {
            String message = String.format("Monthly request limit exceeded. You have made %d book requests this month. Maximum allowed is 3 requests per month.",
                    totalBookRequests);
            System.out.println("ERROR: " + message);
            throw new BadRequestException(message);
        }

        System.out.println("SUCCESS: Monthly limit check passed");
    }

    // Check if non-premium user is trying to request premium book
    private void checkPremiumBookAccess(User student, Book book) {
        System.out.println("🔍 DEBUG: Book ID=" + book.getId() + ", AccessLevel='" + book.getAccessLevel() + "', Title='" + book.getTitle() + "'");

        // Check if the book is premium
        if (book.getAccessLevel() != null && "PREMIUM".equalsIgnoreCase(book.getAccessLevel())) {
            // Check if the student is premium
            boolean isPremium = subscriptionService.isUserPremium(student.getId());
            System.out.println("🔍 DEBUG: Student ID=" + student.getId() + ", Email='" + student.getEmail() + "', isPremium=" + isPremium);
            System.out.println("🔍 DEBUG: Student membership type=" + student.getMembershipType());

            if (!isPremium) {
                System.out.println("❌ ERROR: Non-premium user " + student.getId() + " trying to request premium book " + book.getId());
                throw new BadRequestException("Access denied. This is a premium book. Please upgrade your subscription to access premium content.");
            }
            System.out.println("✅ Premium user " + student.getId() + " - allowing request for premium book " + book.getId());
        } else {
            System.out.println("✅ Normal book " + book.getId() + " - no premium check needed");
        }
    }

    // ==========================================================
    //   DTO MAPPER
    // ==========================================================
    private BookRequestResponseDTO toDto(BookRequest r) {
        BookRequestResponseDTO dto = new BookRequestResponseDTO();

        dto.setId(r.getId());
        dto.setStudentId(r.getStudent() != null ? r.getStudent().getId() : null);

        // Get student name from users table - fetch explicitly if JOIN FETCH fails
        String studentName = null;
        if (r.getStudent() != null) {
            String nameFromDb = r.getStudent().getName();
            String emailFromDb = r.getStudent().getEmail();

            log.debug("Request {} - Raw data from users table: name='{}', email='{}'", r.getId(), nameFromDb, emailFromDb);

            // Check if name exists and is not empty
            if (nameFromDb != null && !nameFromDb.trim().isEmpty()) {
                studentName = nameFromDb.trim();
                log.debug("Request {} - ✓ Using student name: '{}'", r.getId(), studentName);
            } else {
                studentName = emailFromDb;
                log.debug("Request {} - ✗ Using email fallback (name empty/null): '{}'", r.getId(), studentName);
            }
        } else {
            log.warn("Request {} - Student relationship is null after JOIN FETCH", r.getId());
        }

        if (studentName == null) {
            studentName = "Unknown Student";
        }
        dto.setStudentName(studentName);

        dto.setBookId(r.getBook() != null ? r.getBook().getId() : null);
        dto.setBookTitle(r.getBook() != null ? r.getBook().getTitle() : null);
        dto.setBookAuthor(r.getBook() != null ? r.getBook().getAuthor() : null);
        dto.setBookPublisher(r.getBook() != null ? r.getBook().getPublisher() : null);
        dto.setBookCategory(r.getBook() != null ? r.getBook().getGenre() : null);
        dto.setGenre(r.getBook() != null ? r.getBook().getGenre() : null);
        dto.setEdition(null); // Edition not available in Book entity

        // Debug logging for book details
        if (r.getBook() == null) {
            log.warn("BookRequest {} has null book relationship - book details will be null", r.getId());
        } else {
            log.debug("BookRequest {} - Book Title: '{}', Author: '{}'", r.getId(), r.getBook().getTitle(), r.getBook().getAuthor());
        }

        dto.setStatus(r.getStatus() != null ? r.getStatus().name() : null);
        dto.setRequestedAt(r.getRequestedAt());
        dto.setProcessedAt(r.getProcessedAt());

        if (r.getProcessedBy() != null) {
            dto.setProcessedById(r.getProcessedBy().getId());
            dto.setProcessedByName(r.getProcessedBy().getEmail());
        }

        dto.setReason(r.getReason());
        dto.setIssuedRecordId(r.getIssuedRecordId());

        // Set requestDate for frontend compatibility
        dto.setRequestDate(r.getRequestedAt());

        return dto;
    }

    private PageDTO<BookRequestResponseDTO> toPageDto(Page<BookRequest> page) {
        List<BookRequestResponseDTO> content = page.getContent().stream()
                .map(this::toDto)
                .toList();

        return new PageDTO<>(
                content,
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.isFirst(),
                page.isLast()
        );
    }

    // ==========================================================
    //   EMAIL NOTIFICATIONS
    // ==========================================================

    /**
     * Send email notification to student when book request is approved
     */
    private void sendApprovalEmail(BookRequest req, BorrowRecord borrowRecord) {
        try {
            String studentName = req.getStudent().getName() != null && !req.getStudent().getName().trim().isEmpty()
                ? req.getStudent().getName()
                : req.getStudent().getEmail();

            String studentEmail = req.getStudent().getEmail();
            String bookTitle = req.getBook().getTitle();
            String bookAuthor = req.getBook().getAuthor() != null ? req.getBook().getAuthor() : "Unknown Author";
            String processedBy = req.getProcessedBy() != null ? req.getProcessedBy().getEmail() : "Library Staff";

            // Get actual due date from borrow record
            String dueDateStr = "Not specified";
            if (borrowRecord.getDueDate() != null) {
                // Convert Instant to LocalDate/LocalDateTime
                java.time.LocalDateTime dueDateTime = java.time.LocalDateTime.ofInstant(
                    borrowRecord.getDueDate(), java.time.ZoneId.systemDefault());
                dueDateStr = java.time.format.DateTimeFormatter.ofPattern("MMMM dd, yyyy")
                    .format(dueDateTime.toLocalDate());
            }

            // Calculate penalty rate info: 10% of MRP per day overdue, full MRP for lost/damaged
            BigDecimal bookMrp = req.getBook().getMrp() != null ? BigDecimal.valueOf(req.getBook().getMrp()) : BigDecimal.ZERO;
            BigDecimal penaltyPerDay = bookMrp.multiply(BigDecimal.valueOf(0.1));
            String penaltyInfo = String.format("Late returns: ₹%.2f per day (10%% of MRP). Lost/Damaged: ₹%.2f (full MRP)",
                penaltyPerDay.doubleValue(), bookMrp.doubleValue());

            String subject = "Book Request Approved - " + bookTitle;

            String htmlBody = String.format(
                """
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Book Request Approved</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: #f9f9f9; }
                        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
                        .header { background: linear-gradient(135deg, #8B4513, #654321); color: white; padding: 30px 20px; text-align: center; }
                        .content { padding: 30px 20px; }
                        .book-card { background: #f8f9fa; border-left: 4px solid #8B4513; padding: 15px; margin: 20px 0; border-radius: 8px; }
                        .penalty-card { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 8px; color: #856404; }
                        .button { display: inline-block; padding: 12px 24px; background: linear-gradient(145deg, #8B4513, #654321); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 15px rgba(139,69,19,0.3); }
                        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; border-top: 1px solid #e9ecef; }
                        h1 { margin: 0; font-size: 28px; }
                        h2 { color: #8B4513; margin-top: 0; }
                        h3 { color: #856404; margin: 0 0 10px 0; }
                        p { line-height: 1.6; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>CHECK Book Request Approved!</h1>
                            <p>Your request has been processed successfully</p>
                        </div>

                        <div class="content">
                            <p>Hello <strong>%s</strong>,</p>

                            <p>Great news! Your book request has been approved and the book is now available for pickup.</p>

                            <div class="book-card">
                                <h2>BOOK %s</h2>
                                <p><strong>Author:</strong> %s</p>
                                <p><strong>Issued By:</strong> %s</p>
                                <p><strong>Issue Date:</strong> %s</p>
                                <p><strong>Due Date:</strong> %s</p>
                            </div>

                            <div class="penalty-card">
                                <h3>IMPORTANT Penalty Information</h3>
                                <p>%s</p>
                                <ul>
                                    <li>Please collect your book within 7 days from your nearest library</li>
                                    <li>Return the book by the due date specified above</li>
                                    <li>Late returns will be charged the penalty rate shown</li>
                                    <li>Contact library staff if you need to extend the return date</li>
                                </ul>
                            </div>

                            <p>We hope you enjoy reading your new book!</p>

                            <p>Best regards,<br>
                            <strong>Library Management System</strong></p>
                        </div>

                        <div class="footer">
                            <p>This is an automated notification from the Library Management System.</p>
                            <p>If you have any questions, please contact library support.</p>
                        </div>
                    </div>
                </body>
                </html>
                """,
                studentName,
                bookTitle,
                bookAuthor,
                processedBy,
                java.time.format.DateTimeFormatter.ofPattern("MMMM dd, yyyy")
                    .format(java.time.LocalDate.now()),
                dueDateStr,
                penaltyInfo
            );

            emailService.sendEmail(studentEmail, subject, htmlBody);
            log.info("Approval email sent to {} for book request {}", studentEmail, req.getId());

        } catch (Exception e) {
            log.error("Failed to send approval email for request {}: {}", req.getId(), e.getMessage());
            // Don't fail the request approval if email fails
        }
    }

    /**
     * Send email notification to student when book request is rejected
     */
    private void sendRejectionEmail(BookRequest req) {
        try {
            String studentName = req.getStudent().getName() != null && !req.getStudent().getName().trim().isEmpty()
                ? req.getStudent().getName()
                : req.getStudent().getEmail();

            String studentEmail = req.getStudent().getEmail();
            String bookTitle = req.getBook().getTitle();
            String bookAuthor = req.getBook().getAuthor() != null ? req.getBook().getAuthor() : "Unknown Author";
            String processedBy = req.getProcessedBy() != null ? req.getProcessedBy().getEmail() : "Library Staff";
            String rejectionReason = req.getReason() != null && !req.getReason().trim().isEmpty()
                ? req.getReason().trim()
                : "Administrative decision";

            String subject = "Book Request Update - " + bookTitle;

            String htmlBody = String.format(
                """
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Book Request Update</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: #f9f9f9; }
                        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
                        .header { background: linear-gradient(135deg, #dc3545, #b71c1c); color: white; padding: 30px 20px; text-align: center; }
                        .content { padding: 30px 20px; }
                        .book-card { background: #f8f9fa; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; border-radius: 8px; }
                        .reason-card { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 8px; color: #856404; }
                        .button { display: inline-block; padding: 12px 24px; background: linear-gradient(145deg, #28a745, #1e7e34); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 15px rgba(40,167,69,0.3); margin: 10px 0; }
                        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; border-top: 1px solid #e9ecef; }
                        h1 { margin: 0; font-size: 28px; }
                        h2 { color: #dc3545; margin-top: 0; }
                        h3 { color: #856404; margin: 0 0 10px 0; }
                        p { line-height: 1.6; }
                        .highlight { color: #dc3545; font-weight: 600; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>📋 Book Request Update</h1>
                            <p>Your request has been reviewed</p>
                        </div>

                        <div class="content">
                            <p>Hello <span class="highlight">%s</span>,</p>

                            <p>We have reviewed your book request and unfortunately it cannot be approved at this time.</p>

                            <div class="book-card">
                                <h2>📖 %s</h2>
                                <p><strong>Author:</strong> %s</p>
                                <p><strong>Reviewed By:</strong> %s</p>
                                <p><strong>Request Date:</strong> %s</p>
                                <p><strong>Decision:</strong> <span style="color: #dc3545; font-weight: 600;">REJECTED</span></p>
                            </div>

                            <div class="reason-card">
                                <h3>Reason for Rejection</h3>
                                <p>%s</p>
                            </div>

                            <p>You can try requesting other books available in our collection. Feel free to submit new requests for books that interest you.</p>

                            <div style="text-align: center; margin: 30px 0;">
                                <a href="http://localhost:3000/student-dashboard/books" class="button">Browse More Books →</a>
                            </div>

                            <p>If you have any questions about this decision or need assistance finding alternative books, please contact our library staff.</p>

                            <p>Thank you for your understanding.</p>

                            <p>Best regards,<br>
                            <strong>Library Management System</strong></p>
                        </div>

                        <div class="footer">
                            <p><strong>Library Management System</strong></p>
                            <p>Contact us at support@lms.edu | Visit us at library@lms.edu</p>
                            <p>© 2025 Library Management System. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
                """,
                studentName,
                bookTitle,
                bookAuthor,
                processedBy,
                java.time.format.DateTimeFormatter.ofPattern("MMMM dd, yyyy")
                    .format(java.time.LocalDate.now()),
                rejectionReason
            );

            emailService.sendEmail(studentEmail, subject, htmlBody);
            log.info("Rejection email sent to {} for book request {} with reason: {}", studentEmail, req.getId(), rejectionReason);

        } catch (Exception e) {
            log.error("Failed to send rejection email for request {}: {}", req.getId(), e.getMessage());
            // Don't fail the request rejection if email fails
        }
    }
}
