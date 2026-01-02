package com.infy.lms.controller;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/debug")
public class DebugController {

    @GetMapping("/auth")
    public Map<String, Object> debugAuth(Authentication auth) {
        Map<String, Object> m = new HashMap<>();
        m.put("authenticated", auth != null && auth.isAuthenticated());
        m.put("principalClass", auth == null ? null : auth.getPrincipal() == null ? null : auth.getPrincipal().getClass().getName());
        m.put("principal", auth == null ? null : auth.getPrincipal());
        m.put("name", auth == null ? null : auth.getName());
        m.put("authorities", auth == null ? null :
                auth.getAuthorities().stream().map(Object::toString).collect(Collectors.toList()));
        return m;
    }
}
