package com.infy.lms.service;

import com.infy.lms.dto.*;
import com.infy.lms.exception.BadRequestException;
import com.infy.lms.exception.ConflictException;
import com.infy.lms.exception.NotFoundException;
import com.infy.lms.model.Book;
import com.infy.lms.model.Issue;
import com.infy.lms.model.User;
import com.infy.lms.repository.BookRepository;
import com.infy.lms.repository.IssueRepository;
import com.infy.lms.repository.UserRepository;
import com.infy.lms.service.IssueService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.stream.Collectors;
import java.util.List;


@Service
public class IssueServiceImpl implements IssueService {

    private final BookRepository bookRepo;
    private final UserRepository userRepo;
    private final IssueRepository issueRepo;

    public IssueServiceImpl(BookRepository bookRepo,
                            UserRepository userRepo,
                            IssueRepository issueRepo) {
        this.bookRepo = bookRepo;
        this.userRepo = userRepo;
        this.issueRepo = issueRepo;
    }


    @Override
    @Transactional
    public IssueResponse issueBook(IssueRequest req) {

        if (req.getBookId() == null || req.getUserId() == null) {
            throw new IllegalArgumentException("bookId and userId are required");
        }

        // validate user exists
        User user = userRepo.findById(req.getUserId())
                .orElseThrow(() -> new NotFoundException("User not found with id: " + req.getUserId()));

        // atomic decrement of available copies
        int updated = bookRepo.decrementAvailableCopiesIfAvailable(req.getBookId());
        if (updated == 0) {

            boolean exists = bookRepo.existsById(req.getBookId());
            if (!exists)
                throw new NotFoundException("Book not found with id: " + req.getBookId());

            throw new ConflictException("No available copies for book id: " + req.getBookId());
        }

        // reload book
        Book book = bookRepo.findById(req.getBookId())
                .orElseThrow(() ->
                        new NotFoundException("Book not found after decrement: " + req.getBookId()));

        LocalDate issueDate = req.getIssueDate() != null ? req.getIssueDate() : LocalDate.now();
        LocalDate dueDate = req.getDueDate() != null ? req.getDueDate() : issueDate.plusDays(14);

        Issue issue = new Issue();
        issue.setBook(book);
        issue.setUser(user);
        issue.setIssueDate(issueDate);
        issue.setDueDate(dueDate);
        issue.setStatus("ISSUED");
        issue.setPenalty(BigDecimal.ZERO);

        Issue saved = issueRepo.save(issue);

        IssueResponse resp = new IssueResponse();
        resp.setIssueId(saved.getId());
        resp.setBookId(book.getId());
        resp.setUserId(user.getId());
        resp.setIssueDate(saved.getIssueDate());
        resp.setDueDate(saved.getDueDate());
        resp.setStatus(saved.getStatus());

        return resp;
    }

    @Override
    @Transactional
    public ReturnResponse returnBook(ReturnRequest req) {

        if (req.getIssueId() == null)
            throw new BadRequestException("issueId is required");

        Issue issue = issueRepo.findById(req.getIssueId())
                .orElseThrow(() -> new NotFoundException("Issue not found with id: " + req.getIssueId()));

        if ("RETURNED".equals(issue.getStatus()))
            throw new ConflictException("Book already returned");

        LocalDate returnDate = req.getReturnDate() != null ? req.getReturnDate() : LocalDate.now();
        issue.setReturnDate(returnDate);

        // penalty = max(0, daysLate * finePerDay)
        long daysLate = returnDate.isAfter(issue.getDueDate())
                ? issue.getDueDate().until(returnDate).getDays()
                : 0;

        BigDecimal penalty = BigDecimal.valueOf(daysLate).multiply(BigDecimal.valueOf(5)); // ₹5/day example
        issue.setPenalty(penalty);

        issue.setStatus("RETURNED");

        Issue saved = issueRepo.save(issue);

        // Atomically increment available copies
        Book book = saved.getBook();
        book.setAvailableCopies(book.getAvailableCopies() + 1);

        // Save updated book
        bookRepo.save(book);

        ReturnResponse resp = new ReturnResponse();
        resp.setIssueId(saved.getId());
        resp.setBookId(book.getId());
        resp.setUserId(saved.getUser().getId());
        resp.setIssueDate(saved.getIssueDate());
        resp.setDueDate(saved.getDueDate());
        resp.setReturnDate(saved.getReturnDate());
        resp.setPenalty(saved.getPenalty());
        resp.setStatus(saved.getStatus());

        return resp;
    }

    @Override
    @Transactional(readOnly = true)
    public List<IssueHistoryItem> getHistoryForMember(Long memberId) {
        User user = userRepo.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("Member not found: " + memberId));

        List<Issue> issues = issueRepo.findByUserOrderByIssueDateDesc(user);

        return issues.stream().map(i -> {
            IssueHistoryItem item = new IssueHistoryItem();
            item.setIssueId(i.getId());
            item.setBookId(i.getBook() != null ? i.getBook().getId() : null);
            item.setBookTitle(i.getBook() != null ? i.getBook().getTitle() : null);
            item.setUserId(i.getUser() != null ? i.getUser().getId() : null);
            item.setIssueDate(i.getIssueDate());
            item.setDueDate(i.getDueDate());
            item.setReturnDate(i.getReturnDate());
            item.setPenalty(i.getPenalty() == null ? 0.0 : i.getPenalty().doubleValue());
            item.setStatus(i.getStatus());
            return item;
        }).collect(Collectors.toList());
    }

}
