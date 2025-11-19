package com.infy.lms.config; // Adjust package name if necessary

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity // Enables Spring Security configuration
public class SecurityConfig {

    // 1. Password Encoder Bean (Stays the same)
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // 2. Security Filter Chain (The part that defines access rules)
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // Disable CSRF (Cross-Site Request Forgery) protection for API calls
                // This is common for state-less REST APIs.
                .csrf(AbstractHttpConfigurer::disable)

                // Authorize (allow) HTTP requests
                .authorizeHttpRequests(auth -> auth

                                // IMPORTANT: Allow public access to the registration and login APIs
                                .requestMatchers("/api/auth/register", "/api/auth/login").permitAll()

                                // Allow access to all other paths (for now, we will restrict later)
                                .requestMatchers("/**").permitAll()

                        // We will uncomment the line below later to secure other endpoints:
                        // .anyRequest().authenticated()
                )
                // Disable default forms and basic auth, as we are using custom JSON login
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable);

        return http.build();
    }
}