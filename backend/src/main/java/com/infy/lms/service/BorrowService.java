package com.infy.lms.service;

import com.infy.lms.dto.BorrowHistoryDTO;
import com.infy.lms.dto.BorrowRequestDTO;
import com.infy.lms.dto.ReturnRequestDTO;

import java.util.List;

public interface BorrowService {

    String borrowBook(BorrowRequestDTO request);

    String returnBook(ReturnRequestDTO request);

    List<BorrowHistoryDTO> getBorrowHistory(Long studentId);
}
