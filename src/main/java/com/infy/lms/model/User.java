package com.infy.lms.model;

import com.infy.lms.enums.Role;
import com.infy.lms.enums.UserStatus;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "users") // Matches your table name 'users'
@Data // From Lombok: generates getters, setters, toString, equals, hashCode
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // Maps to 'id' in your table

    @Column(nullable = false)
    private String name; // Maps to 'name'

    @Column(nullable = false, unique = true)
    private String email; // Maps to 'email' (used as username)

    private String phone; // Maps to 'phone'

    @Enumerated(EnumType.STRING) // Store Enum names as strings in DB
    @Column(nullable = false)
    private Role role; // Maps to 'role' ENUM

    @Column(nullable = false)
    private String password; // Maps to 'password' (will be hashed)

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserStatus status; // Maps to 'status' ENUM

    @Column(name = "first_login", nullable = false)
    private Boolean firstLogin; // Maps to 'first_login'

    @Column(name = "id_proof_path")
    private String idProofPath; // Maps to 'id_proof_path'

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt; // Maps to 'created_at'

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt; // Maps to 'updated_at'
}