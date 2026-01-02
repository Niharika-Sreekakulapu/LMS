package com.infy.lms.service;

import com.infy.lms.enums.Role;
import com.infy.lms.model.*;
import com.infy.lms.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.PrintWriter;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final BookRepository bookRepository;
    private final BorrowRecordRepository borrowRecordRepository;
    private final BookRequestRepository bookRequestRepository;
    private final UserRepository userRepository;

    public byte[] generateLibraryUsageReport() throws IOException {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        PrintWriter writer = new PrintWriter(outputStream);

        // CSV Header
        writer.println("Report Type,Library Usage Report");
        writer.println("Generated Date," + LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE));
        writer.println();

        // Book Statistics
        long totalBooks = bookRepository.count();
        long borrowedBooks = borrowRecordRepository.findByReturnedAtIsNull().size();
        long availableBooks = totalBooks - borrowedBooks;

        writer.println("Book Statistics");
        writer.println("Total Books,Available Books,Borrowed Books");
        writer.println(totalBooks + "," + availableBooks + "," + borrowedBooks);
        writer.println();

        // User Statistics
        List<User> allUsers = userRepository.findAll();
        long totalUsers = allUsers.size();
        long studentUsers = allUsers.stream().filter(u -> u.getRole() == Role.STUDENT).count();
        long librarianUsers = allUsers.stream().filter(u -> u.getRole() == Role.LIBRARIAN).count();
        long adminUsers = allUsers.stream().filter(u -> u.getRole() == Role.ADMIN).count();

        writer.println("User Statistics");
        writer.println("Total Users,Students,Librarians,Admins");
        writer.println(totalUsers + "," + studentUsers + "," + librarianUsers + "," + adminUsers);
        writer.println();

        // Borrowing Activity (last 30 days)
        Instant thirtyDaysAgo = Instant.now().minusSeconds(30L * 24 * 60 * 60); // 30 days in seconds
        List<BorrowRecord> allBorrows = borrowRecordRepository.findAll();
        List<BorrowRecord> recentBorrows = allBorrows.stream()
            .filter(b -> b.getBorrowedAt().isAfter(thirtyDaysAgo))
            .toList();

        writer.println("Borrowing Activity (Last 30 Days)");
        writer.println("Total Borrows,Active Borrows,Overdue Borrows");
        long activeBorrows = recentBorrows.stream().filter(b -> b.getReturnedAt() == null).count();
        long overdueBorrows = recentBorrows.stream()
            .filter(b -> b.getReturnedAt() == null && b.getDueDate() != null && Instant.now().isAfter(b.getDueDate()))
            .count();

        writer.println(recentBorrows.size() + "," + activeBorrows + "," + overdueBorrows);

        writer.flush();
        writer.close();
        return outputStream.toByteArray();
    }

    public byte[] generateOverdueBooksReport() throws IOException {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        PrintWriter writer = new PrintWriter(outputStream);

        writer.println("Report Type,Overdue Books Report");
        writer.println("Generated Date," + LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE));
        writer.println();

        writer.println("Student ID,Student Name,Book Title,Book ISBN,Due Date,Days Overdue");

        List<BorrowRecord> overdueBorrows = borrowRecordRepository.findOverdue(Instant.now());

        for (BorrowRecord borrow : overdueBorrows) {
            User student = borrow.getStudent();
            Book book = borrow.getBook();
            long daysOverdue = java.time.Duration.between(borrow.getDueDate(), Instant.now()).toDays();

            writer.println(
                student.getId() + "," +
                student.getName() + "," +
                book.getTitle() + "," +
                (book.getIsbn() != null ? book.getIsbn() : "") + "," +
                LocalDate.ofInstant(borrow.getDueDate(), java.time.ZoneOffset.UTC).format(DateTimeFormatter.ISO_LOCAL_DATE) + "," +
                daysOverdue
            );
        }

        writer.flush();
        writer.close();
        return outputStream.toByteArray();
    }

    public byte[] generateFinesPaymentsReport() throws IOException {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        PrintWriter writer = new PrintWriter(outputStream);

        writer.println("Report Type,Fines & Payments Report");
        writer.println("Generated Date," + LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE));
        writer.println();

        writer.println("Student ID,Student Name,Book Title,Penalty Amount,Penalty Status,Penalty Type");

        List<BorrowRecord> allBorrows = borrowRecordRepository.findAll();

        for (BorrowRecord borrow : allBorrows) {
            if (borrow.getPenaltyAmount().compareTo(java.math.BigDecimal.ZERO) > 0) {
                User student = borrow.getStudent();
                Book book = borrow.getBook();

                writer.println(
                    student.getId() + "," +
                    student.getName() + "," +
                    book.getTitle() + "," +
                    borrow.getPenaltyAmount() + "," +
                    borrow.getPenaltyStatus() + "," +
                    borrow.getPenaltyType()
                );
            }
        }

        writer.flush();
        writer.close();
        return outputStream.toByteArray();
    }

    public byte[] generatePopularBooksReport() throws IOException {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        PrintWriter writer = new PrintWriter(outputStream);

        writer.println("Report Type,Popular Books Report");
        writer.println("Generated Date," + LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE));
        writer.println();

        writer.println("Book Title,Author,ISBN,Total Borrows,Current Status");

        List<Book> books = bookRepository.findAll();

        for (Book book : books) {
            List<BorrowRecord> borrows = borrowRecordRepository.findByBookId(book.getId());
            long borrowCount = borrows.size();
            String status = book.getAvailableCopies() > 0 ? "Available" : "Borrowed";

            writer.println(
                book.getTitle() + "," +
                (book.getAuthor() != null ? book.getAuthor() : "") + "," +
                (book.getIsbn() != null ? book.getIsbn() : "") + "," +
                borrowCount + "," +
                status
            );
        }

        writer.flush();
        writer.close();
        return outputStream.toByteArray();
    }
}
