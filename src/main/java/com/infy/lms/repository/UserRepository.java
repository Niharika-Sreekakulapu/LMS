package com.infy.lms.repository;

import com.infy.lms.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // IMPORTANT: This method allows us to find the user by their email/username.
    Optional<User> findByEmail(String email);
}