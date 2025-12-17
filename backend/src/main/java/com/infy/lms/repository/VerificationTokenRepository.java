package com.infy.lms.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.infy.lms.model.VerificationToken;

public interface VerificationTokenRepository extends JpaRepository<VerificationToken, Long> {
    VerificationToken findByToken(String token);
}
