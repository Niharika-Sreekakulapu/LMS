package com.infy.lms.controller;

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
@PreAuthorize("hasRole('ADMIN')") // require ROLE_ADMIN for all endpoints in this controller
public class AdminController {

    private final AuthService authService;

    @PostMapping("/approve/{id}")
    public ResponseEntity<?> approve(@PathVariable @Positive Long id) {
        User u = authService.approveUser(id);
        return ResponseEntity.ok(java.util.Map.of(
                "message", "User approved",
                "id", u.getId(),
                "status", u.getStatus()
        ));
    }

    @PostMapping("/reject/{id}")
    public ResponseEntity<?> reject(
            @PathVariable @Positive Long id,
            @RequestParam(required = false) String reason) {

        User u = authService.rejectUser(id, reason);
        return ResponseEntity.ok(java.util.Map.of(
                "message", "User rejected",
                "id", u.getId(),
                "status", u.getStatus()
        ));
    }

    @GetMapping("/users")
    public ResponseEntity<List<UserSummaryDto>> listUsers() {
        List<UserSummaryDto> list = authService.listPendingUsers();
        return ResponseEntity.ok(list);
    }
}
