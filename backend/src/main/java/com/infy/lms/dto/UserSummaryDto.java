package com.infy.lms.dto;

import com.infy.lms.enums.Role;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Data
@AllArgsConstructor
public class UserSummaryDto {
    private Long id;
    private String name;
    private String email;
    private String phone;
    private Role role;
    private String status;       // ADDED
    private String idProofPath;  // ADDED
    private Instant createdAt;
    private String membershipType; // ADDED

    // Additional profile fields
    private LocalDate dateOfBirth;
    private String address;
    private String emergencyContactName;
    private String emergencyContactPhone;
    private String course;
    private String year;
    private String studentId;
    private String interests;
    private String hobbies;
    private Integer monthlyReadingGoal;
    private Boolean emailNotifications;
    private Integer pointsBalance;
    private String badges; // comma-separated
    private Integer readingStreak;
    private String favoriteGenres; // comma-separated
    private Integer totalReadTime;
    private Integer favoriteBooksCount;
    private Integer reviewsGiven;
    private String profilePicture;

    // Calculated fields
    private Integer totalBorrows;
    private Integer activeBorrows;
    private Double outstandingFines;
    private Integer profileCompleteness;
}
