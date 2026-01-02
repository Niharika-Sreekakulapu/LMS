package com.infy.lms.repository;

import com.infy.lms.enums.UserStatus;
import com.infy.lms.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    // Add this method to return all users with given status
    List<User> findAllByStatus(UserStatus status);

    // Method to find users by membership type
    List<User> findByMembershipType(User.MembershipType membershipType);
}
