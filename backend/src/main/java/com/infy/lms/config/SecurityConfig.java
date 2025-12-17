package com.infy.lms.config;

import com.infy.lms.repository.ApiTokenRepository;
import com.infy.lms.security.TokenAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableMethodSecurity(prePostEnabled = true)
@RequiredArgsConstructor
public class SecurityConfig {

    private final ApiTokenRepository apiTokenRepository;
    private final UserDetailsService userDetailsService;

    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        config.setAllowedOriginPatterns(List.of(
                "http://localhost:3000",
                "http://localhost:5173",
                "http://localhost:5174",
                "http://localhost:5175",
                "http://localhost:5176",
                "http://localhost:5177",
                "http://localhost:5178",
                "http://localhost:5179"  // <-- Frontend Vite dev server port (ADD THIS)
        ));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        // make headers permissive to avoid preflight failure when browser sends other headers
        config.setAllowedHeaders(List.of("*")); // <-- change to allow all headers
        config.setExposedHeaders(List.of("Authorization"));
        config.setAllowCredentials(false);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }


    /**
     * Security chain:
     * - Public: GET /api/books and GET /api/books/** (public catalogue)
     * - Public: /api/auth/** (login/register)
     * - Preflight OPTIONS allowed
     * - Everything else requires authentication
     * Method-level @PreAuthorize controls roles (LIBRARIAN / ADMIN / STUDENT).
     */
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {

        TokenAuthenticationFilter tokenFilter = new TokenAuthenticationFilter(apiTokenRepository, userDetailsService);

        http
                .userDetailsService(userDetailsService)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())

                // stateless for token-based auth
                .sessionManagement(sess -> sess.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/books", "/api/books/**").permitAll()
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/api/dev/**").permitAll()    // <-- ADD THIS LINE (dev-only)
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/actuator/**").permitAll()
                        .requestMatchers("/api/dev/**").permitAll()
                        .anyRequest().authenticated()
                )

                // disable form login (API only)
                .formLogin(form -> form.disable())

                // do not enable basic by default (dev-only alternative below)
                .httpBasic(httpBasic -> httpBasic.disable())

                // add your custom token filter before UsernamePasswordAuthenticationFilter
                .addFilterBefore(tokenFilter, org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public AuthenticationManager authenticationManager(
            UserDetailsService userDetailsService,
            BCryptPasswordEncoder passwordEncoder
    ) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder);

        // A very simple, non-AOP, non-weird AuthenticationManager
        return new ProviderManager(List.of(provider));
    }

    /*
     * DEV helper: If you want in-memory users for local testing add this bean.
     * Uncomment/enable while developing; remove in production.
     *
     * @Bean
     * public InMemoryUserDetailsManager inMemoryUserDetailsManager() {
     *     UserDetails admin = User.withDefaultPasswordEncoder()
     *         .username("admin").password("adminpass").roles("ADMIN").build();
     *     UserDetails lib = User.withDefaultPasswordEncoder()
     *         .username("lib").password("libpass").roles("LIBRARIAN").build();
     *     UserDetails stu = User.withDefaultPasswordEncoder()
     *         .username("stu").password("stupass").roles("STUDENT").build();
     *     return new InMemoryUserDetailsManager(admin, lib, stu);
     * }
     */
}
