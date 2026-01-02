package com.infy.lms.controller;

import com.infy.lms.model.User;
import com.infy.lms.repository.UserRepository;
import com.infy.lms.service.SubscriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/subscriptions")
@RequiredArgsConstructor
public class SubscriptionController {

    private final SubscriptionService subscriptionService;
    private final UserRepository userRepository;

    /**
     * Get current user's subscription status
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getSubscriptionStatus(Authentication authentication) {
        Long userId = resolveUserId(authentication);

        User user = userRepository.findById(userId).orElseThrow();
        User.MembershipType membershipType = subscriptionService.getEffectiveMembershipType(userId);
        boolean isPremium = subscriptionService.isUserPremium(userId);

        Map<String, Object> status = new HashMap<>();
        status.put("membershipType", membershipType);
        status.put("isPremium", isPremium);
        status.put("subscriptionPackage", user.getSubscriptionPackage());
        status.put("subscriptionStart", user.getSubscriptionStart());
        status.put("subscriptionEnd", user.getSubscriptionEnd());

        return ResponseEntity.ok(status);
    }

    /**
     * Activate premium subscription for current user
     * In future, this would integrate with payment gateway
     */
    @PostMapping("/activate")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<User> activateSubscription(
            @RequestBody Map<String, String> request,
            Authentication authentication
    ) {
        Long userId = resolveUserId(authentication);
        String packageName = request.get("package");

        if (packageName == null || packageName.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        User.MembershipPackage membershipPackage;
        try {
            membershipPackage = User.MembershipPackage.valueOf(packageName.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }

        User updatedUser = subscriptionService.activateSubscription(userId, membershipPackage);
        return ResponseEntity.ok(updatedUser);
    }

    /**
     * Extend premium subscription for current user
     * In future, this would integrate with payment gateway
     */
    @PostMapping("/extend")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<User> extendSubscription(
            @RequestBody Map<String, String> request,
            Authentication authentication
    ) {
        Long userId = resolveUserId(authentication);
        String packageName = request.get("package");

        if (packageName == null || packageName.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        User.MembershipPackage membershipPackage;
        try {
            membershipPackage = User.MembershipPackage.valueOf(packageName.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }

        User updatedUser = subscriptionService.extendSubscription(userId, membershipPackage);
        return ResponseEntity.ok(updatedUser);
    }

    /**
     * Get available subscription packages
     */
    @GetMapping("/packages")
    public ResponseEntity<User.MembershipPackage[]> getSubscriptionPackages() {
        return ResponseEntity.ok(User.MembershipPackage.values());
    }

    private Long resolveUserId(Authentication authentication) {
        if (authentication == null) {
            throw new IllegalStateException("No authentication present");
        }
        String principalName = authentication.getName();
        return userRepository.findByEmail(principalName)
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found in DB: " + principalName))
                .getId();
    }
}
