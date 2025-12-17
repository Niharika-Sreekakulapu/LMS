package com.infy.lms.service;

import com.infy.lms.dto.BorrowHistoryDTO;
import com.infy.lms.dto.BorrowRequestDTO;
import com.infy.lms.dto.ReturnRequestDTO;
import com.infy.lms.model.BorrowRecord;

import java.util.List;

/**
 * Core borrow/issue service for LMS.
 * Expanded to support overdue detection, filtered queries, penalty handling and scheduler reconciliation.
 */
public interface BorrowService {

    // --- existing core operations ---
    BorrowRecord borrowBook(BorrowRequestDTO request);

    String returnBook(ReturnRequestDTO request);

    List<BorrowHistoryDTO> getBorrowHistory(Long studentId);

    // --- query / filter operations ---
    /**
     * Find borrows with optional filters.
     * If a parameter is null it is ignored.
     *
     * @param studentId optional student id filter
     * @param bookId optional book id filter
     * @param status optional status filter (ISSUED, RETURNED, OVERDUE, LOST, etc.)
     * @param overdue if true -> only overdue (not returned and dueDate < now), if false -> not overdue, if null -> ignore
     */
    List<BorrowHistoryDTO> findBorrows(Long studentId, Long bookId, String status, Boolean overdue);

    /**
     * List overdue borrows (optionally for a specific student).
     */
    List<BorrowHistoryDTO> getOverdueBorrows(Long studentId);

    // --- penalty / payment operations ---
    /**
     * Compute and persist penalty for a borrow record (returns updated penalty amount).
     * Service reads configured finePerDay to compute.
     */
    double computeAndSetPenalty(Long borrowRecordId);

    /**
     * Pay penalty for borrow record (mark penalty status PAID and update records).
     * Returns remaining/unpaid amount (0 if fully paid).
     */
    double payPenalty(Long borrowRecordId, double amountPaid);

    // --- maintenance / scheduler hook ---
    /**
     * Reconcile overdue borrows (intended to be called from a scheduler).
     * Should compute penalties and optionally mark status as OVERDUE for outstanding borrows.
     */
    void reconcileOverdues();

    // --- Penalty / payment API ---
    /**
     * List pending penalties for a specific member.
     */
    List<com.infy.lms.dto.PenaltyDTO> getPendingPenaltiesForMember(Long memberId);

    /**
     * List all penalties (pending, paid, waived) for a specific member.
     */
    List<com.infy.lms.dto.PenaltyDTO> getAllPenaltiesForMember(Long memberId);

    /**
     * List all pending penalties (admin/librarian use).
     */
    List<com.infy.lms.dto.PenaltyDTO> getAllPendingPenalties();

    /**
     * Pay (full or partial) penalty for a borrow record.
     *
     * @param borrowRecordId id of borrow record
     * @param amount amount paid
     * @return a human-readable result message
     */
    String payPenalty(Long borrowRecordId, java.math.BigDecimal amount);

    /**
     * Test method to pay penalty for a borrow record.
     * @param borrowRecordId id of borrow record
     * @param amountPaid amount paid
     * @return remaining amount
     * @deprecated Use payPenalty(Long, BigDecimal) instead
     */
    @Deprecated
    double payPenaltyTest(Long borrowRecordId, double amountPaid);

    /**
     * Waive penalty for a borrow record (admin/librarian only).
     *
     * @param borrowRecordId id of borrow record
     * @return a human-readable result message
     */
    String waivePenalty(Long borrowRecordId);

}
