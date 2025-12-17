package com.infy.lms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkApprovalResponseDTO {
    private int approvedCount;
    private int failedCount;
    private List<FailedRequestDTO> failedRequests;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FailedRequestDTO {
        private Long id;
        private String reason;
    }
}
