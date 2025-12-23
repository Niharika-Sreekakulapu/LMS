package com.infy.lms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminSettings {
    private int defaultLoanDays;
    private double finePerDay;
    private int maxBooksPerUser;
    private String membershipRules;
    private String lastUpdated;
    private String lastUpdatedBy;
}
