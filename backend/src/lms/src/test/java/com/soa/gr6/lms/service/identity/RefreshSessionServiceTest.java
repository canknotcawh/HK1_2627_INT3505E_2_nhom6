package com.soa.gr6.lms.service.identity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;

import com.soa.gr6.lms.domain.RefreshSession;
import com.soa.gr6.lms.domain.User;
import com.soa.gr6.lms.repository.RefreshSessionRepository;
import com.soa.gr6.lms.security.jwt.JwtService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RefreshSessionServiceTest {
    @Mock private RefreshSessionRepository repository;
    @Mock private JwtService jwtService;
    @Mock private User user;

    @Test
    void refreshConsumesCurrentSessionAndCreatesSuccessor() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();
        UUID familyId = UUID.randomUUID();
        String raw = "signed-refresh-token";
        RefreshSession current = new RefreshSession(sessionId, user, familyId, hash(raw), Instant.now().plusSeconds(600));
        when(user.getId()).thenReturn(userId);
        when(user.isActive()).thenReturn(true);
        when(jwtService.requireRefreshClaims(raw)).thenReturn(new JwtService.RefreshClaims(userId, sessionId));
        when(repository.findByIdForUpdate(sessionId)).thenReturn(Optional.of(current));
        when(jwtService.generateRefreshToken(eq(user), any(UUID.class))).thenReturn("successor-token");
        when(jwtService.refreshTokenExpiry("successor-token")).thenReturn(Instant.now().plusSeconds(600));
        when(jwtService.generateAccessToken(user)).thenReturn("new-access");

        Optional<RefreshSessionService.SessionTokens> result =
                new RefreshSessionService(repository, jwtService).rotate(raw);

        assertTrue(result.isPresent());
        assertEquals("new-access", result.get().accessToken());
        assertEquals("successor-token", result.get().refreshToken());
        assertFalse(current.isUsableAt(Instant.now()));
        verify(repository).save(any(RefreshSession.class));
    }

    @Test
    void reuseRevokesTheWholeRefreshFamily() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();
        UUID familyId = UUID.randomUUID();
        String raw = "already-used-refresh-token";
        RefreshSession current = new RefreshSession(sessionId, user, familyId, hash(raw), Instant.now().plusSeconds(600));
        current.revoke(Instant.now().minusSeconds(1), UUID.randomUUID());
        when(user.getId()).thenReturn(userId);
        when(jwtService.requireRefreshClaims(raw)).thenReturn(new JwtService.RefreshClaims(userId, sessionId));
        when(repository.findByIdForUpdate(sessionId)).thenReturn(Optional.of(current));

        Optional<RefreshSessionService.SessionTokens> result =
                new RefreshSessionService(repository, jwtService).rotate(raw);

        assertTrue(result.isEmpty());
        verify(repository).revokeFamily(eq(familyId), any(Instant.class));
    }

    private static String hash(String value) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(value.getBytes(StandardCharsets.UTF_8)));
    }
}
