package com.infy.lms.repository;

import com.infy.lms.model.ApiToken;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.time.Instant;

public interface ApiTokenRepository extends JpaRepository<ApiToken, String> {
    Optional<ApiToken> findByToken(String token);
    void deleteByExpiresAtBefore(Instant now);
}
