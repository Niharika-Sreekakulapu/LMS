package com.infy.lms.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * Dev-only endpoint to inspect the authenticated principal & authorities.
 * Remove this file after debugging.
 */
@RestController
public class DevTestController {

    @GetMapping("/api/dev/whoami")
    public ResponseEntity<Map<String,Object>> whoami() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        Map<String,Object> out = new HashMap<>();
        out.put("authenticated", auth != null && auth.isAuthenticated());
        out.put("principal", auth == null ? null : auth.getPrincipal().toString());
        out.put("authorities", auth == null ? null : auth.getAuthorities());
        return ResponseEntity.ok(out);
    }
}
