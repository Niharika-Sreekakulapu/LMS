package com.infy.lms.dto;

import java.time.Instant;

public class LoginResponse {
    private String token;
    private String tokenType = "Bearer";
    private UserSummaryDto user;
    private Instant issuedAt = Instant.now();

    // NEW: include expiresAt so frontend can persist token TTL
    private Instant expiresAt;

    public LoginResponse() {}
    public LoginResponse(String token, UserSummaryDto user) {
        this.token = token;
        this.user = user;
        this.issuedAt = Instant.now();
    }

    // Optional: convenience constructor including expiresAt
    public LoginResponse(String token, UserSummaryDto user, Instant expiresAt) {
        this.token = token;
        this.user = user;
        this.issuedAt = Instant.now();
        this.expiresAt = expiresAt;
    }

    // getters & setters
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public String getTokenType() { return tokenType; }
    public UserSummaryDto getUser() { return user; }
    public void setUser(UserSummaryDto user) { this.user = user; }
    public Instant getIssuedAt() { return issuedAt; }
    public void setIssuedAt(Instant issuedAt) { this.issuedAt = issuedAt; }

    // NEW getter/setter
    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
}
