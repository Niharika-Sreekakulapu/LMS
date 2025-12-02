package com.infy.lms.repository;

import com.infy.lms.model.BorrowRecord;
import com.infy.lms.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BorrowRecordRepository extends JpaRepository<BorrowRecord, Long> {
    List<BorrowRecord> findByStudent(User student);
}
