package com.infy.lms.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.infy.lms.repository.VerificationTokenRepository;
import com.infy.lms.repository.UserRepository;
import com.infy.lms.model.VerificationToken;
import com.infy.lms.model.User;

@RestController
@RequestMapping("/api/auth")
public class EmailVerificationController {

    @Autowired
    private VerificationTokenRepository tokenRepo;

    @Autowired
    private UserRepository userRepo;

    // http://localhost:8081/api/auth/verify?token=xxxx
    @GetMapping("/verify")
    public String verifyAccount(@RequestParam("token") String token) {

        VerificationToken vToken = tokenRepo.findByToken(token);

        if (vToken == null) {
            return "Invalid or expired verification token.";
        }

        User user = vToken.getUser();
        user.setEnabled(true);   // Enable the user
        userRepo.save(user);

        return "Email verified successfully! You can now login.";
    }
}
