package com.infy.lms.repository;

import com.infy.lms.model.AcquisitionRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AcquisitionRequestRepository extends JpaRepository<AcquisitionRequest, Long> {
    List<AcquisitionRequest> findByStudentId(Long studentId);
    List<AcquisitionRequest> findByStatus(AcquisitionRequest.Status status);
    List<AcquisitionRequest> findByStudentIdAndCreatedAtBetween(Long studentId, LocalDateTime startDate, LocalDateTime endDate);
}
