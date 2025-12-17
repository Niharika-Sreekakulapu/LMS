package com.infy.lms.service;

import com.infy.lms.model.User;

public interface UserService {
    /**
     * Persist user (status should be set to PENDING by implementation).
     */
    User register(User user);

    /**
     * Generate a verification token and send an email containing the verification link.
     */
    void sendVerificationEmail(User user);
}
