package com.infy.lms.repository;

import com.infy.lms.model.Issue;
import com.infy.lms.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface IssueRepository extends JpaRepository<Issue, Long> {
    List<Issue> findByUserOrderByIssueDateDesc(User user);
}
