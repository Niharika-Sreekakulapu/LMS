package com.infy.lms.dto;

import com.infy.lms.enums.Role;
import lombok.Data; // Remember to add Lombok dependency and enable annotation processing

@Data // For getters and setters
public class RegistrationRequest {
    private String name;
    private String email;
    private String phone;
    private Role role; // Should be LIBRARIAN or STUDENT
    private String password;
    // We'll handle file upload (id_proof_path) separately later, keep it simple for now
}