package com.infy.lms.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.infy.lms.enums.Role;
import com.infy.lms.enums.UserStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Entity
@Table(name = "users", uniqueConstraints = {
        @UniqueConstraint(columnNames = "email")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, length = 255, unique = true)
    private String email;

    @Column(length = 20)
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(nullable = false)
    private String password; // already BCrypted

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserStatus status = UserStatus.PENDING;

    @Builder.Default
    @Column(name = "first_login", nullable = false)
    private Boolean firstLogin = true;

    @Column(name = "id_proof_path")
    private String idProofPath;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    // ✅ Add this field for email verification
    @Builder.Default
    @Column(nullable = false)
    private boolean enabled = false;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    @OneToMany(mappedBy = "user", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @JsonIgnore
    private List<ApiToken> apiTokens;

    public enum MembershipType { NORMAL, PREMIUM }

    public enum MembershipPackage {
        ONE_MONTH(1, 349),
        SIX_MONTHS(6, 899),
        ONE_YEAR(12, 1299);

        private final int durationMonths;
        private final int price;

        MembershipPackage(int durationMonths, int price) {
            this.durationMonths = durationMonths;
            this.price = price;
        }

        public int getDurationMonths() { return durationMonths; }
        public int getPrice() { return price; }
    }

    @Builder.Default
    @Column(name = "membership_type", nullable = false)
    @Enumerated(EnumType.STRING)
    private MembershipType membershipType = MembershipType.NORMAL;

    // Premium subscription fields
    @Column(name = "subscription_package")
    @Enumerated(EnumType.STRING)
    private MembershipPackage subscriptionPackage;

    @Column(name = "subscription_start")
    private Instant subscriptionStart;

    @Column(name = "subscription_end")
    private Instant subscriptionEnd;

    // Additional profile fields for students
    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(length = 500)
    private String address;

    @Column(name = "emergency_contact_name")
    private String emergencyContactName;

    @Column(name = "emergency_contact_phone")
    private String emergencyContactPhone;

    @Column(length = 100)
    private String course;

    @Column(name = "year_of_study", length = 20)
    private String year;

    @Column(name = "student_id", length = 50)
    private String studentId;

    @Column(length = 200)
    private String interests;

    @Column(length = 200)
    private String hobbies;

    @Column(name = "monthly_reading_goal")
    private Integer monthlyReadingGoal;

    @Builder.Default
    @Column(name = "email_notifications", nullable = false)
    private Boolean emailNotifications = false;

    @Builder.Default
    @Column(name = "points_balance", nullable = false)
    private Integer pointsBalance = 0;

    @Column(length = 500)
    private String badges; // comma-separated or JSON

    @Builder.Default
    @Column(name = "reading_streak", nullable = false)
    private Integer readingStreak = 0;

    @Column(name = "favorite_genres", length = 500)
    private String favoriteGenres; // comma-separated or JSON

    @Builder.Default
    @Column(name = "total_read_time", nullable = false)
    private Integer totalReadTime = 0;

    @Builder.Default
    @Column(name = "favorite_books_count", nullable = false)
    private Integer favoriteBooksCount = 0;

    @Builder.Default
    @Column(name = "reviews_given", nullable = false)
    private Integer reviewsGiven = 0;

    @Column(name = "profile_picture")
    private String profilePicture;
}
