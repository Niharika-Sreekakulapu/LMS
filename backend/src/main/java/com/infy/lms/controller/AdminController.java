package com.infy.lms.controller;

import com.infy.lms.dto.AdminActionResponse;
import com.infy.lms.dto.UserSummaryDto;
import com.infy.lms.model.User;
import com.infy.lms.service.AuthService;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Validated
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AuthService authService;

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
}
