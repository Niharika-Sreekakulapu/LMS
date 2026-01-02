package com.infy.lms.controller;

import com.infy.lms.dto.AdminActionResponse;
import com.infy.lms.dto.AdminSettings;
import com.infy.lms.dto.UserSummaryDto;
import com.infy.lms.model.RequestStatus;
import com.infy.lms.model.User;
import com.infy.lms.repository.BookRequestRepository;
import com.infy.lms.repository.BookRepository;
import com.infy.lms.service.AuthService;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Validated
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AuthService authService;
    private final BookRequestRepository bookRequestRepository;
    private final BookRepository bookRepository;

    // In-memory settings storage (for demo purposes - should be in database)
    private static final AdminSettings DEFAULT_SETTINGS = new AdminSettings(
        14,     // defaultLoanDays
        10.0,   // finePerDay
        3,      // maxBooksPerUser
        "Standard membership rules apply", // membershipRules
        LocalDateTime.now().toString(), // lastUpdated
        "system" // lastUpdatedBy
    );

    private AdminSettings currentSettings = DEFAULT_SETTINGS;

    @PostMapping("/approve/{id}")
    public ResponseEntity<AdminActionResponse> approve(@PathVariable @Positive Long id) {
        User u = authService.approveUser(id);
        AdminActionResponse resp = new AdminActionResponse(
                "User approved",
                u.getId(),
                u.getStatus().name()
        );
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/reject/{id}")
    public ResponseEntity<AdminActionResponse> reject(
            @PathVariable @Positive Long id,
            @RequestParam(required = false) String reason
    ) {
        User u = authService.rejectUser(id, reason);
        AdminActionResponse resp = new AdminActionResponse(
                "User rejected",
                u.getId(),
                u.getStatus().name()
        );
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/users")
    public ResponseEntity<List<UserSummaryDto>> listUsers(
            @RequestParam(required = false) String status
    ) {
        List<UserSummaryDto> all = authService.listAllUsers();

        if (status == null || status.isBlank()) {
            return ResponseEntity.ok(all);
        }

        List<UserSummaryDto> filtered = all.stream()
                .filter(u -> u.getStatus().equalsIgnoreCase(status))
                .toList();

        return ResponseEntity.ok(filtered);
    }

    @GetMapping("/metrics")
    public ResponseEntity<Map<String, Long>> getMetrics() {
        long totalRequests = bookRequestRepository.count();
        long pendingRequests = bookRequestRepository.findByStatus(RequestStatus.PENDING).size();
        long approvedRequests = bookRequestRepository.findByStatus(RequestStatus.APPROVED).size();
        long rejectedRequests = bookRequestRepository.findByStatus(RequestStatus.REJECTED).size();

        Map<String, Long> metrics = new HashMap<>();
        metrics.put("totalRequests", totalRequests);
        metrics.put("pendingRequests", pendingRequests);
        metrics.put("approvedRequests", approvedRequests);
        metrics.put("rejectedRequests", rejectedRequests);

        return ResponseEntity.ok(metrics);
    }

    @GetMapping("/book-stats")
    @PreAuthorize("hasRole('ADMIN') or hasRole('LIBRARIAN')")
    public ResponseEntity<Map<String, Long>> getBookStats() {
        long totalBooks = bookRepository.count();
        // Temporary implementation until findByAccessLevel method is added to repository
        long normalBooks = 0;
        long premiumBooks = 0;

        Map<String, Long> stats = new HashMap<>();
        stats.put("totalBooks", totalBooks);
        stats.put("normalBooks", normalBooks);
        stats.put("premiumBooks", premiumBooks);

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/settings")
    public ResponseEntity<AdminSettings> getSettings() {
        return ResponseEntity.ok(currentSettings);
    }

    @PutMapping("/settings")
    public ResponseEntity<AdminSettings> updateSettings(@RequestBody AdminSettings newSettings) {
        // Get current user for audit trail
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String updatedBy = auth != null ? auth.getName() : "unknown";

        // Update settings with timestamp
        AdminSettings updated = new AdminSettings(
            newSettings.getDefaultLoanDays(),
            newSettings.getFinePerDay(),
            newSettings.getMaxBooksPerUser(),
            newSettings.getMembershipRules() != null ? newSettings.getMembershipRules() : currentSettings.getMembershipRules(),
            LocalDateTime.now().toString(),
            updatedBy
        );

        currentSettings = updated;
        return ResponseEntity.ok(currentSettings);
    }


}
