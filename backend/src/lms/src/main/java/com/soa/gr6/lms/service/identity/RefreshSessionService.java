package com.soa.gr6.lms.service.identity;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;

import com.soa.gr6.lms.domain.RefreshSession;
import com.soa.gr6.lms.domain.User;
import com.soa.gr6.lms.repository.RefreshSessionRepository;
import com.soa.gr6.lms.security.jwt.JwtService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RefreshSessionService {
    private final RefreshSessionRepository repository;
    private final JwtService jwtService;

    public RefreshSessionService(RefreshSessionRepository repository, JwtService jwtService) {
        this.repository = repository;
        this.jwtService = jwtService;
    }

    @Transactional
    public SessionTokens create(User user) {
        UUID sessionId = UUID.randomUUID();
        UUID familyId = UUID.randomUUID();
        String token = jwtService.generateRefreshToken(user, sessionId);
        repository.save(new RefreshSession(sessionId, user, familyId, hash(token), jwtService.refreshTokenExpiry(token)));
        return new SessionTokens(jwtService.generateAccessToken(user), token);
    }

    /** Returns empty for invalid, expired, revoked, or reused tokens. Reuse revocation commits. */
    @Transactional
    public Optional<SessionTokens> rotate(String rawToken) {
        JwtService.RefreshClaims claims = jwtService.requireRefreshClaims(rawToken);
        Optional<RefreshSession> found = repository.findByIdForUpdate(claims.sessionId());
        if (found.isEmpty()) {
            return Optional.empty();
        }

        RefreshSession current = found.get();
        if (!current.getUser().getId().equals(claims.userId()) || !constantTimeEquals(current.getTokenHash(), hash(rawToken))) {
            return Optional.empty();
        }
        Instant now = Instant.now();
        if (!current.isUsableAt(now)) {
            repository.revokeFamily(current.getFamilyId(), now);
            return Optional.empty();
        }
        if (!current.getUser().isActive()) {
            repository.revokeFamily(current.getFamilyId(), now);
            return Optional.empty();
        }

        UUID nextSessionId = UUID.randomUUID();
        String nextToken = jwtService.generateRefreshToken(current.getUser(), nextSessionId);
        RefreshSession next = new RefreshSession(nextSessionId, current.getUser(), current.getFamilyId(), hash(nextToken),
                jwtService.refreshTokenExpiry(nextToken));
        repository.save(next);
        current.revoke(now, nextSessionId);
        return Optional.of(new SessionTokens(jwtService.generateAccessToken(current.getUser()), nextToken));
    }

    @Transactional
    public void revoke(String rawToken) {
        try {
            JwtService.RefreshClaims claims = jwtService.requireRefreshClaims(rawToken);
            repository.findByIdForUpdate(claims.sessionId()).ifPresent(session -> {
                if (session.getUser().getId().equals(claims.userId())
                        && constantTimeEquals(session.getTokenHash(), hash(rawToken))) {
                    repository.revokeFamily(session.getFamilyId(), Instant.now());
                }
            });
        } catch (RuntimeException ignored) {
            // Logout is idempotent and must clear the client even for expired/corrupt tokens.
        }
    }

    @Transactional
    public void revokeAll(UUID userId) {
        repository.revokeAllForUser(userId, Instant.now());
    }

    private static String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is unavailable", e);
        }
    }

    private static boolean constantTimeEquals(String expected, String actual) {
        return MessageDigest.isEqual(expected.getBytes(StandardCharsets.US_ASCII), actual.getBytes(StandardCharsets.US_ASCII));
    }

    public record SessionTokens(String accessToken, String refreshToken) {
    }
}
