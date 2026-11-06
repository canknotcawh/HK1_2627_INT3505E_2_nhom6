package com.soa.gr6.lms.security.jwt;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

class JwtSecretValidatorTest {
    @Test
    void developmentProfileMayUseLocalDevelopmentSecret() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("dev");
        JwtSecretValidator validator = new JwtSecretValidator(
                "dev-only-change-me-32-bytes-minimum-secret", environment);
        assertDoesNotThrow(validator::validate);
    }

    @Test
    void productionProfileRejectsKnownDevelopmentSecret() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("prod");
        JwtSecretValidator validator = new JwtSecretValidator(
                "dev-only-change-me-32-bytes-minimum-secret", environment);
        assertThrows(IllegalStateException.class, validator::validate);
    }

    @Test
    void everyProfileRejectsShortSecret() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("prod");
        JwtSecretValidator validator = new JwtSecretValidator("too-short", environment);
        assertThrows(IllegalStateException.class, validator::validate);
    }
}
