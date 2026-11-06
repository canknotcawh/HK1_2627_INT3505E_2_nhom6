package com.soa.gr6.lms.security.jwt;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.util.UUID;

import com.soa.gr6.lms.domain.User;
import com.soa.gr6.lms.domain.enums.UserRole;
import com.soa.gr6.lms.exception.ApiException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class JwtServiceTest {
    @Mock private User user;

    @Test
    void refreshClaimsContainUserAndSessionIds() {
        UUID userId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();
        when(user.getId()).thenReturn(userId);
        when(user.getEmail()).thenReturn("user@example.com");
        when(user.getRole()).thenReturn(UserRole.USER);
        JwtService jwtService = new JwtService("test-only-signing-key-with-more-than-32-bytes", Duration.ofMinutes(15), Duration.ofDays(7));

        String token = jwtService.generateRefreshToken(user, sessionId);

        JwtService.RefreshClaims claims = jwtService.requireRefreshClaims(token);
        assertEquals(userId, claims.userId());
        assertEquals(sessionId, claims.sessionId());
    }

    @Test
    void accessTokenCannotBeUsedAsRefreshToken() {
        UUID userId = UUID.randomUUID();
        when(user.getId()).thenReturn(userId);
        when(user.getEmail()).thenReturn("user@example.com");
        when(user.getRole()).thenReturn(UserRole.USER);
        JwtService jwtService = new JwtService("test-only-signing-key-with-more-than-32-bytes", Duration.ofMinutes(15), Duration.ofDays(7));

        String token = jwtService.generateAccessToken(user);

        assertThrows(ApiException.class, () -> jwtService.requireRefreshClaims(token));
    }
}
