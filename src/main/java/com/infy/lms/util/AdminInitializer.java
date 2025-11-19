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

        userRepository.findByEmail("admin").ifPresent(existingAdmin -> {

            // We check if the password is the plain text 'Admin@123'
            // If it is, we know it needs to be hashed.
            if (existingAdmin.getPassword().equals("Admin@123")) {

                // 1. Perform the hashing
                String hashedPassword = passwordEncoder.encode("Admin@123");

                // 2. Update the user object with the secure hash
                existingAdmin.setPassword(hashedPassword);

                // 3. Save the updated user back to the MySQL database
                userRepository.save(existingAdmin);

                System.out.println("✅ Admin password successfully hashed and updated in DB.");
            }
        });
    }
}