package com.infy.lms.controller;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.infy.lms.dto.AcquisitionRequestCreateDto;
import com.infy.lms.dto.AcquisitionRequestResponseDto;
import com.infy.lms.model.AcquisitionRequest;
import com.infy.lms.service.AcquisitionRequestService;
import com.infy.lms.model.User;
import com.infy.lms.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RequestParam;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/acquisition-requests")
@RequiredArgsConstructor
public class AcquisitionRequestController {

    private final AcquisitionRequestService service;
    private final UserRepository userRepository;

    @PostMapping
    public ResponseEntity<AcquisitionRequestResponseDto> create(
            @Valid @RequestBody AcquisitionRequestCreateDto dto,
            Authentication authentication
    ) {
        Long studentId = resolveUserId(authentication);
        AcquisitionRequestResponseDto resp = service.create(studentId, dto);
        return ResponseEntity.status(201).body(resp);
    }

    private Long resolveUserId(Authentication authentication) {
        if (authentication == null) {
            throw new IllegalStateException("No authentication present");
        }
        String principalName = authentication.getName(); // typically email or username
        Optional<User> userOpt = userRepository.findByEmail(principalName); // change to findByUsername if needed
        if (userOpt.isEmpty()) {
            throw new IllegalStateException("Authenticated user not found in DB: " + principalName);
        }
        return userOpt.get().getId();
    }

    // Student: GET /api/acquisition-requests/mine
    @GetMapping("/mine")
    public ResponseEntity<List<AcquisitionRequestResponseDto>> myRequests(Authentication authentication) {
        Long studentId = resolveUserId(authentication);
        List<AcquisitionRequestResponseDto> list = service.findByStudent(studentId);
        return ResponseEntity.ok(list);
    }

    // Admin/Librarian: GET /api/acquisition-requests
    // Optional query: ?status=PENDING (case-insensitive)
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','LIBRARIAN')")
    public ResponseEntity<List<AcquisitionRequestResponseDto>> allRequests(
            @RequestParam(value = "status", required = false) String statusStr
    ) {
        if (statusStr == null || statusStr.isBlank()) {
            // return all
            List<AcquisitionRequestResponseDto> all = service.findByStatus(null); // adjust below
            return ResponseEntity.ok(all);
        }

        AcquisitionRequest.Status status;
        try {
            status = AcquisitionRequest.Status.valueOf(statusStr.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().build();
        }
        List<AcquisitionRequestResponseDto> list = service.findByStatus(status);
        return ResponseEntity.ok(list);
    }

    @PatchMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN','LIBRARIAN')")
    public ResponseEntity<AcquisitionRequestResponseDto> approve(
            @PathVariable("id") Long id,
            Authentication authentication
    ) {
        Long reviewerId = resolveUserId(authentication);
        AcquisitionRequestResponseDto dto = service.approve(id, reviewerId);
        return ResponseEntity.ok(dto);
    }

    @PatchMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN','LIBRARIAN')")
    public ResponseEntity<AcquisitionRequestResponseDto> reject(
            @PathVariable("id") Long id,
            @RequestBody(required = false) RejectionDto body,
            Authentication authentication
    ) {
        Long reviewerId = resolveUserId(authentication);
        String reason = body == null ? null : body.getReason();
        AcquisitionRequestResponseDto dto = service.reject(id, reviewerId, reason);
        return ResponseEntity.ok(dto);
    }

    // tiny DTO for rejection reason

    public static class RejectionDto {
        @JsonAlias({"reason","rejectionReason"})
        private String reason;
        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
    }

}
