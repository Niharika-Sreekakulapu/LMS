package com.infy.lms.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class LoginRequest {
    @Email(message = "Invalid email")
    @NotBlank(message = "Email should not be blank")
    private String email;

    @NotBlank(message = "Password should not be blank")
    @Size(min = 8, message = "Password must be at least 8 characters")
    private String password;

    private String role;
}
