package com.infy.lms.service;

import com.infy.lms.dto.BookRequestResponseDTO;
import com.infy.lms.dto.CreateBookRequestDTO;
import com.infy.lms.dto.PageDTO;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.List;

public interface BookRequestService {
    BookRequestResponseDTO createRequest(Long studentId, CreateBookRequestDTO dto);
    List<BookRequestResponseDTO> listRequests();
    List<BookRequestResponseDTO> listRequestsByStatus(String status); // optional helper
    PageDTO<BookRequestResponseDTO> listRequestsPaginated(Pageable pageable);
    PageDTO<BookRequestResponseDTO> listRequestsByStatusPaginated(String status, Pageable pageable);
    BookRequestResponseDTO approveRequest(Long requestId, Long processedById);
    BookRequestResponseDTO approveRequest(Long requestId, Long processedById, java.time.LocalDate customDueDate);
    BookRequestResponseDTO rejectRequest(Long requestId, Long processedById, String reason);
    List<BookRequestResponseDTO> listRequestsByStudent(Long studentId);

    // Bulk operations
    com.infy.lms.dto.BulkApprovalResponseDTO bulkApproveRequests(List<Long> requestIds, Long processedBy);

}
