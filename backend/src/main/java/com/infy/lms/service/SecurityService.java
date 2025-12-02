package com.infy.lms.service;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service("securityService")
public class SecurityService {

    private final com.infy.lms.repository.UserRepository userRepository;

    public SecurityService(com.infy.lms.repository.UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // return true if current authenticated principal corresponds to the given userId
    public boolean isCurrentUser(Authentication authentication, Long userId) {
        if (authentication == null || !authentication.isAuthenticated()) return false;
        Object principal = authentication.getPrincipal();
        // if your principal is a Spring UserDetails wrapper with username=email:
        String username = null;
        if (principal instanceof org.springframework.security.core.userdetails.User) {
            username = ((org.springframework.security.core.userdetails.User) principal).getUsername();
        } else if (principal instanceof com.infy.lms.model.User) {
            username = ((com.infy.lms.model.User) principal).getEmail();
        } else if (principal instanceof org.springframework.security.core.userdetails.UserDetails) {
            username = ((org.springframework.security.core.userdetails.UserDetails) principal).getUsername();
        }
        if (username == null) return false;
        return userRepository.findByEmail(username)
                .map(u -> u.getId().equals(userId))
                .orElse(false);
    }
}
