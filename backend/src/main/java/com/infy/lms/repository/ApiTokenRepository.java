package com.infy.lms.repository;

import com.infy.lms.model.ApiToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ApiTokenRepository extends JpaRepository<ApiToken, String> {

    @Query("select t from ApiToken t join fetch t.user u where t.token = :token")
    Optional<ApiToken> findByTokenFetchUser(@Param("token") String token);

    Optional<ApiToken> findByToken(String token);
}
