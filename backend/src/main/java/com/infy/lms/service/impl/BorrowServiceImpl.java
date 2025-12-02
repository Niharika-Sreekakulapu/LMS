package com.infy.lms.service.impl;

import com.infy.lms.dto.BorrowHistoryDTO;
import com.infy.lms.dto.BorrowRequestDTO;
import com.infy.lms.dto.ReturnRequestDTO;
import com.infy.lms.enums.BorrowStatus;
import com.infy.lms.exception.BorrowException;
import com.infy.lms.model.Book;
import com.infy.lms.model.BorrowRecord;
import com.infy.lms.model.User;
import com.infy.lms.repository.BookRepository;
import com.infy.lms.repository.BorrowRecordRepository;
import com.infy.lms.repository.UserRepository;
import com.infy.lms.service.BorrowService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BorrowServiceImpl implements BorrowService {

    private final UserRepository userRepo;
    private final BookRepository bookRepo;
    private final BorrowRecordRepository borrowRepo;

    @Override
    public String borrowBook(BorrowRequestDTO request) {

        User student = userRepo.findById(request.getStudentId())
                .orElseThrow(() -> new BorrowException("Student not found"));

        Book book = bookRepo.findById(request.getBookId())
                .orElseThrow(() -> new BorrowException("Book not found"));

        if (book.getAvailableCopies() <= 0) {
            throw new BorrowException("No copies available");
        }

        BorrowRecord record = BorrowRecord.builder()
                .student(student)
                .book(book)
                .borrowedAt(Instant.now())
                .dueDate(Instant.now().plus(Duration.ofDays(7))) // 1 week
                .status(BorrowStatus.BORROWED)
                .build();

        borrowRepo.save(record);

        book.setAvailableCopies(book.getAvailableCopies() - 1);
        bookRepo.save(book);

        return "Book borrowed successfully!";
    }

    @Override
    public String returnBook(ReturnRequestDTO request) {

        BorrowRecord record = borrowRepo.findById(request.getBorrowRecordId())
                .orElseThrow(() -> new BorrowException("Record not found"));

        record.setReturnedAt(Instant.now());

        // calculate fine
        if (record.getReturnedAt().isAfter(record.getDueDate())) {
            long daysLate = Duration.between(record.getDueDate(), record.getReturnedAt()).toDays();
            record.setFineAmount(daysLate * 10); // ₹10 per day
            record.setStatus(BorrowStatus.LATE_RETURNED);
        } else {
            record.setStatus(BorrowStatus.RETURNED);
        }

        borrowRepo.save(record);

        // increase stock
        Book book = record.getBook();
        book.setAvailableCopies(book.getAvailableCopies() + 1);
        bookRepo.save(book);

        return "Book returned successfully!";
    }

    @Override
    public List<BorrowHistoryDTO> getBorrowHistory(Long studentId) {

        User student = userRepo.findById(studentId)
                .orElseThrow(() -> new BorrowException("Student not found"));

        return borrowRepo.findByStudent(student)
                .stream()
                .map(r -> BorrowHistoryDTO.builder()
                        .bookTitle(r.getBook().getTitle())
                        .borrowedAt(r.getBorrowedAt())
                        .dueDate(r.getDueDate())
                        .returnedAt(r.getReturnedAt())
                        .fine(r.getFineAmount())
                        .build())
                .collect(Collectors.toList());
    }
}
