package com.infy.lms.util;

import com.infy.lms.enums.Role;
import com.infy.lms.enums.UserStatus;
import com.infy.lms.model.User;
import com.infy.lms.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminInitializer implements CommandLineRunner {

    // These variables will hold the database connector and the password hatter
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    // This is the "constructor" where Spring gives us the objects we asked for
    public AdminInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // This method runs automatically when the Spring application starts
    @Override
    public void run(String... args) throws Exception {

        String adminEmail = "admin@example.com";
        String adminPassword = "Admin@123";

        userRepository.findByEmail(adminEmail).ifPresentOrElse(existingAdmin -> {
            // Check if the password needs to be hashed
            if (existingAdmin.getPassword().equals(adminPassword)) {
                // 1. Perform the hashing
                String hashedPassword = passwordEncoder.encode(adminPassword);

                // 2. Update the user object with the secure hash
                existingAdmin.setPassword(hashedPassword);

                // 3. Ensure admin is properly configured
                existingAdmin.setRole(Role.ADMIN);
                existingAdmin.setStatus(UserStatus.APPROVED);
                existingAdmin.setEnabled(true);

                // 4. Save the updated user back to the MySQL database
                userRepository.save(existingAdmin);

                System.out.println("✅ Admin password successfully hashed and updated in DB.");
            }
        }, () -> {
            // Admin user doesn't exist, create it
            User adminUser = User.builder()
                    .name("Administrator")
                    .email(adminEmail)
                    .password(passwordEncoder.encode(adminPassword))
                    .role(Role.ADMIN)
                    .status(UserStatus.APPROVED)
                    .enabled(true)
                    .firstLogin(false)
                    .build();

            userRepository.save(adminUser);
            System.out.println("✅ Admin user created successfully with email: " + adminEmail);
        });
    }
}
