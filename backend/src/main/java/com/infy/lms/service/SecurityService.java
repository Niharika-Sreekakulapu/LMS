package com.infy.lms.service;

import com.infy.lms.model.User;
import com.infy.lms.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service("securityService")
public class SecurityService {

    private final UserRepository userRepository;

    public SecurityService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * Return true when the authenticated principal corresponds to the provided userId.
     * - Fast path: if Authentication. principal is your domain User or a UserDetails with getId()
     * - Fallback: resolve by username/email via userRepository
     */
    public Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) return null;

        Object principal = authentication.getPrincipal();

        // 1) If principal is your domain User
        if (principal instanceof com.infy.lms.model.User) {
            return ((com.infy.lms.model.User) principal).getId();
        }

        // 2) If principal is a custom UserDetails with getId()
        try {
            var method = principal != null ? principal.getClass().getMethod("getId") : null;
            if (method != null) {
                Object maybeId = method.invoke(principal);
                if (maybeId instanceof Number) {
                    return ((Number) maybeId).longValue();
                }
            }
        } catch (NoSuchMethodException ignored) {
            // fallthrough
        } catch (Exception ignored) {
            // fallthrough
        }

        // 3) If principal is UserDetails or String, use username/email to lookup
        String username = null;
        if (principal instanceof UserDetails) {
            username = ((UserDetails) principal).getUsername();
        } else if (principal instanceof String) {
            username = (String) principal;
        }

        if (username == null) return null;

        Optional<com.infy.lms.model.User> u = userRepository.findByEmail(username);
        return u.map(com.infy.lms.model.User::getId).orElse(null);
    }

    /**
     * Check if the current user has any of the specified roles
     */
    public boolean hasAnyRole(String... roles) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) return false;

        for (String role : roles) {
            if (authentication.getAuthorities().stream()
                    .anyMatch(authority -> authority.getAuthority().equals("ROLE_" + role))) {
                return true;
            }
        }
        return false;
    }
}
