package com.infy.lms.controller;

import com.infy.lms.dto.BookRequestResponseDTO;
import com.infy.lms.dto.CreateBookRequestDTO;
import com.infy.lms.dto.PageDTO;
import com.infy.lms.service.BookRequestService;
import com.infy.lms.service.SecurityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/issue-requests")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class BookRequestController {

    private final BookRequestService requestService;
    private final SecurityService securityService;

    @PreAuthorize("hasAnyRole('STUDENT','LIBRARIAN','ADMIN')")
    @PostMapping
    public ResponseEntity<BookRequestResponseDTO> createRequest(
            @Valid @RequestBody CreateBookRequestDTO body) {

        Long studentId = securityService.getCurrentUserId();
        if (studentId == null) {
            return ResponseEntity.status(401).build();
        }

        BookRequestResponseDTO created = requestService.createRequest(studentId, body);
        URI location = URI.create("/api/issue-requests/" + created.getId());
        return ResponseEntity.created(location).body(created);
    }

    @PreAuthorize("hasRole('STUDENT')")
    @GetMapping("/my")
    public ResponseEntity<List<BookRequestResponseDTO>> myRequests() {
        Long studentId = securityService.getCurrentUserId();
        List<BookRequestResponseDTO> list = requestService.listRequestsByStudent(studentId);
        return ResponseEntity.ok(list);
    }

    @PreAuthorize("hasRole('STUDENT')")
    @GetMapping("/monthly-count")
    public ResponseEntity<Map<String, Integer>> getMonthlyRequestCount() {
        Long studentId = securityService.getCurrentUserId();
        if (studentId == null) {
            return ResponseEntity.status(401).build();
        }

        // Cast to access the getMonthlyRequestCount method
        int count = ((com.infy.lms.service.impl.BookRequestServiceImpl) requestService).getMonthlyRequestCount(studentId);
        return ResponseEntity.ok(Map.of("monthlyRequests", count, "limit", 3, "remaining", Math.max(0, 3 - count)));
    }

    @PreAuthorize("hasAnyRole('LIBRARIAN','ADMIN')")
    @GetMapping
    public ResponseEntity<?> listRequests(
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "size", required = false, defaultValue = "10") Integer size) {

        // If pagination is requested, return paginated results
        if (page != null) {
            Pageable pageable = PageRequest.of(page, size);
            PageDTO<BookRequestResponseDTO> pageDto = (status == null)
                    ? requestService.listRequestsPaginated(pageable)
                    : requestService.listRequestsByStatusPaginated(status, pageable);
            return ResponseEntity.ok(pageDto);
        }

        // Backward compatibility - return full list if no pagination requested
        List<BookRequestResponseDTO> list = (status == null)
                ? requestService.listRequests()
                : requestService.listRequestsByStatus(status);

        return ResponseEntity.ok(list);
    }

    @PreAuthorize("hasAnyRole('LIBRARIAN','ADMIN')")
    @PatchMapping("/{id}/approve")
    public ResponseEntity<BookRequestResponseDTO> approve(
            @PathVariable("id") Long requestId,
            @RequestBody(required = false) Map<String, String> body) {

        Long processedBy = securityService.getCurrentUserId();
        java.time.LocalDate customDueDate = null;

        // Check if custom due date is provided
        if (body != null && body.containsKey("expectedDueDate") && body.get("expectedDueDate") != null) {
            try {
                customDueDate = java.time.LocalDate.parse(body.get("expectedDueDate"));
                System.out.println("🎯 Custom due date provided: " + customDueDate);
            } catch (Exception e) {
                System.out.println("⚠️ Invalid due date format: " + body.get("expectedDueDate") + " - using default calculation");
            }
        }

        BookRequestResponseDTO dto = requestService.approveRequest(requestId, processedBy, customDueDate);
        return ResponseEntity.ok(dto);
    }

    @PreAuthorize("hasAnyRole('LIBRARIAN','ADMIN')")
    @PatchMapping("/{id}/reject")
    public ResponseEntity<BookRequestResponseDTO> reject(
            @PathVariable("id") Long requestId,
            @RequestBody(required = false) Map<String, String> body) {

        Long processedBy = securityService.getCurrentUserId();
        String reason = body != null ? body.get("reason") : null;

        BookRequestResponseDTO dto = requestService.rejectRequest(requestId, processedBy, reason);
        return ResponseEntity.ok(dto);
    }

    @PreAuthorize("hasAnyRole('LIBRARIAN','ADMIN')")
    @PostMapping("/bulk-approve")
    public ResponseEntity<com.infy.lms.dto.BulkApprovalResponseDTO> bulkApprove(
            @RequestBody Map<String, List<Long>> body) {

        List<Long> requestIds = body.get("requestIds");
        if (requestIds == null || requestIds.isEmpty()) {
            return ResponseEntity.badRequest().body(
                com.infy.lms.dto.BulkApprovalResponseDTO.builder()
                    .approvedCount(0)
                    .failedCount(0)
                    .failedRequests(java.util.Collections.emptyList())
                    .build()
            );
        }

        Long processedBy = securityService.getCurrentUserId();
        com.infy.lms.dto.BulkApprovalResponseDTO response = requestService.bulkApproveRequests(requestIds, processedBy);
        return ResponseEntity.ok(response);
    }
}
