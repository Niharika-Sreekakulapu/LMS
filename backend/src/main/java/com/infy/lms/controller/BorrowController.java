package com.infy.lms.controller;

import com.infy.lms.dto.BorrowHistoryDTO;
import com.infy.lms.dto.BorrowRequestDTO;
import com.infy.lms.dto.ReturnRequestDTO;
import com.infy.lms.service.BorrowService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/borrow")
@RequiredArgsConstructor
public class BorrowController {

    private final BorrowService borrowService;

    @PostMapping("/borrow")
    public String borrow(@RequestBody BorrowRequestDTO req) {
        return borrowService.borrowBook(req);
    }

    @PostMapping("/return")
    public String returnBook(@RequestBody ReturnRequestDTO req) {
        return borrowService.returnBook(req);
    }

    @GetMapping("/history/{studentId}")
    public List<BorrowHistoryDTO> history(@PathVariable Long studentId) {
        return borrowService.getBorrowHistory(studentId);
    }
}
