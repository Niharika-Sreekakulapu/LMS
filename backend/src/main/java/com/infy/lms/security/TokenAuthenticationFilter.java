package com.infy.lms.security;

import com.infy.lms.model.ApiToken;
import com.infy.lms.model.User;
import com.infy.lms.repository.ApiTokenRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

public class TokenAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(TokenAuthenticationFilter.class);

    private final ApiTokenRepository tokenRepo;
    private final UserDetailsService userDetailsService;

    public TokenAuthenticationFilter(ApiTokenRepository tokenRepo, UserDetailsService uds) {
        this.tokenRepo = tokenRepo;
        this.userDetailsService = uds;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String header = request.getHeader("Authorization");
        log.debug("[TOKEN-FILTER] Raw Authorization header: {}", header);

        if (header != null && header.startsWith("Bearer ")) {
            String raw = header.substring(7);
            String token = raw == null ? null : raw.trim();
            log.debug("[TOKEN-FILTER] Extracted token (len={}): {}",
                    token == null ? 0 : token.length(),
                    token == null ? "<null>" : (token.length() > 12 ? token.substring(0,12) + "..." : token));

            if (token == null || token.isEmpty()) {
                log.debug("[TOKEN-FILTER] token empty after trim -> skipping");
            } else {
                tokenRepo.findByTokenFetchUser(token).ifPresentOrElse(apiToken -> {
                    log.debug("[TOKEN-FILTER] Found api_token row user_id={} issuedAt={} expiresAt={}",
                            apiToken.getUser() == null ? "<no-user>" : apiToken.getUser().getId(),
                            apiToken.getIssuedAt(), apiToken.getExpiresAt());

                    Instant now = Instant.now();
                    if (apiToken.getExpiresAt() != null && apiToken.getExpiresAt().isBefore(now)) {
                        log.debug("[TOKEN-FILTER] token expired at {}, now={}. Clearing context.", apiToken.getExpiresAt(), now);
                        SecurityContextHolder.clearContext();
                        return;
                    }

                    try {
                        // Prefer building Authentication from UserDetails (preserves password/flags/authorities)
                        String username = apiToken.getUser() != null ? apiToken.getUser().getEmail() : null;

                        if (username != null && userDetailsService != null) {
                            UserDetails ud = userDetailsService.loadUserByUsername(username);
                            Collection<SimpleGrantedAuthority> authorities = ud.getAuthorities()
                                    .stream()
                                    .map(a -> new SimpleGrantedAuthority(a.getAuthority()))
                                    .collect(Collectors.toList());

                            // If UserDetails returned no authorities, derive from DB User.role
                            if (authorities.isEmpty() && apiToken.getUser() != null) {
                                authorities = deriveAuthoritiesFromUser(apiToken.getUser());
                                log.debug("[TOKEN-FILTER] UserDetails had no authorities; derived from User.role: {}", authorities);
                            }

                            UsernamePasswordAuthenticationToken auth =
                                    new UsernamePasswordAuthenticationToken(ud, null, authorities);
                            SecurityContextHolder.getContext().setAuthentication(auth);
                            log.debug("[TOKEN-FILTER] SecurityContext set using UserDetails for username={}", username);
                        } else if (apiToken.getUser() != null) {
                            // No UserDetailsService available — create principal with authorities from DB
                            var principal = new TokenPrincipal(apiToken.getUser().getId(), apiToken.getUser().getEmail());
                            Collection<SimpleGrantedAuthority> authorities = deriveAuthoritiesFromUser(apiToken.getUser());
                            UsernamePasswordAuthenticationToken auth =
                                    new UsernamePasswordAuthenticationToken(principal, null, authorities);
                            SecurityContextHolder.getContext().setAuthentication(auth);
                            log.debug("[TOKEN-FILTER] SecurityContext set with fallback principal userId={} authorities={}",
                                    principal.getId(), authorities);
                        } else {
                            log.debug("[TOKEN-FILTER] api_token row present but user is null -> skipping authentication");
                        }
                    } catch (Exception ex) {
                        log.error("[TOKEN-FILTER] error while setting auth: {}", ex.getMessage(), ex);
                    }

                }, () -> {
                    log.debug("[TOKEN-FILTER] No api_token row found for token = '{}'", token);
                });
            }
        } else {
            log.debug("[TOKEN-FILTER] No Bearer header present");
        }

        filterChain.doFilter(request, response);
    }

    private Collection<SimpleGrantedAuthority> deriveAuthoritiesFromUser(User user) {
        if (user == null || user.getRole() == null) {
            return Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER"));
        }

        // In case you later support multiple roles, handle both single and multi-value.
        // Here your Role enum is a single value; map it to ROLE_<NAME> and return as a collection.
        String roleName = user.getRole().name().trim(); // e.g. "LIBRARIAN"
        if (roleName.isEmpty()) {
            return Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER"));
        }

        // Always produce ROLE_ prefixed authorities to match hasRole(...) checks.
        String authority = roleName.startsWith("ROLE_") ? roleName : "ROLE_" + roleName;
        return Collections.singletonList(new SimpleGrantedAuthority(authority));
    }


    // small inner principal used if UserDetails unavailable
    public static class TokenPrincipal {
        private final Long id;
        private final String email;
        public TokenPrincipal(Long id, String email) { this.id = id; this.email = email; }
        public Long getId() { return id; }
        public String getEmail() { return email; }
    }
}
