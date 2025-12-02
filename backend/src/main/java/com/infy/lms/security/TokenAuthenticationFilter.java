package com.infy.lms.security;

import com.infy.lms.repository.ApiTokenRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

public class TokenAuthenticationFilter extends OncePerRequestFilter {

    private final ApiTokenRepository tokenRepo;
    private final UserDetailsService userDetailsService;

    public TokenAuthenticationFilter(ApiTokenRepository tokenRepo, UserDetailsService uds) {
        this.tokenRepo = tokenRepo;
        this.userDetailsService = uds;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws IOException, jakarta.servlet.ServletException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7).trim();
            tokenRepo.findByToken(token).ifPresent(apiToken -> {
                if (apiToken.getExpiresAt() != null && apiToken.getExpiresAt().isBefore(java.time.Instant.now())) {
                    // expired — ignore
                    return;
                }

                String username = apiToken.getUser().getEmail();
                UserDetails ud = userDetailsService.loadUserByUsername(username);
                var auth = new UsernamePasswordAuthenticationToken(ud, null, ud.getAuthorities());
                SecurityContextHolder.getContext().setAuthentication(auth);
            });
        }

        filterChain.doFilter(request, response);
    }
}
