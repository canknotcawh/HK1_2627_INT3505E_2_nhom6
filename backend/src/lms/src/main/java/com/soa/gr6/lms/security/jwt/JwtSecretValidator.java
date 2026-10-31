package com.soa.gr6.lms.security.jwt;

import java.nio.charset.StandardCharsets;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Component;

@Component
public class JwtSecretValidator {
    private static final String DEVELOPMENT_SECRET = "dev-only-change-me-32-bytes-minimum-secret";

    private final String secret;
    private final Environment environment;

    public JwtSecretValidator(@Value("${app.jwt.secret}") String secret, Environment environment) {
        this.secret = secret;
        this.environment = environment;
    }

    @PostConstruct
    void validate() {
        boolean development = environment.acceptsProfiles(Profiles.of("dev"));
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("JWT_SECRET must contain at least 32 UTF-8 bytes");
        }
        if (!development && DEVELOPMENT_SECRET.equals(secret)) {
            throw new IllegalStateException("A non-development profile must not use the development JWT secret");
        }
    }
}
