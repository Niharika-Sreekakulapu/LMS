package com.infy.lms.config;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.util.HashMap;
import java.util.Map;

@Configuration
public class DotEnvConfig {

    @Bean
    public Dotenv dotenv() {
        Dotenv dotenv = Dotenv.configure()
                .directory(".")
                .filename(".env")
                .ignoreIfMissing()
                .load();
        return dotenv;
    }

    @Bean
    public MapPropertySource dotenvPropertySource(ConfigurableEnvironment environment, Dotenv dotenv) {
        Map<String, Object> propertyMap = new HashMap<>();
        dotenv.entries().forEach(entry -> {
            propertyMap.put(entry.getKey(), entry.getValue());
        });

        MapPropertySource propertySource = new MapPropertySource("dotenv", propertyMap);
        environment.getPropertySources().addLast(propertySource);
        return propertySource;
    }
}
