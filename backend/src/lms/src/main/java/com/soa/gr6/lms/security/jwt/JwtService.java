package com.soa.gr6.lms.security.jwt;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.soa.gr6.lms.domain.User;
import com.soa.gr6.lms.exception.ApiException;
import com.soa.gr6.lms.exception.ErrorCode;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Component
public class JwtService {

    private static final String CLAIM_TYPE = "typ";
    public static final String TYPE_ACCESS = "access";
    public static final String TYPE_REFRESH = "refresh";

    private final SecretKey key;
    private final Duration accessTokenTtl;
    private final Duration refreshTokenTtl;

    public JwtService(@Value("${app.jwt.secret}") String secret,
                      @Value("${app.jwt.access-token-ttl}") Duration accessTokenTtl,
                      @Value("${app.jwt.refresh-token-ttl}") Duration refreshTokenTtl) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenTtl = accessTokenTtl;
        this.refreshTokenTtl = refreshTokenTtl;
    }

    public String generateAccessToken(User user) {
        return buildToken(user, TYPE_ACCESS, accessTokenTtl);
    }

    public String generateRefreshToken(User user) {
        return generateRefreshToken(user, UUID.randomUUID());
    }

    public String generateRefreshToken(User user, UUID sessionId) {
        return buildToken(user, TYPE_REFRESH, refreshTokenTtl, sessionId);
    }

    public UUID requireRefreshToken(String token) {
        Claims claims = parse(token);
        if (!TYPE_REFRESH.equals(claims.get(CLAIM_TYPE, String.class))) {
            throw new ApiException(ErrorCode.UNAUTHORIZED);
        }
        return subjectAsUuid(claims);
    }

    public RefreshClaims requireRefreshClaims(String token) {
        Claims claims = parse(token);
        if (!TYPE_REFRESH.equals(claims.get(CLAIM_TYPE, String.class))) {
            throw new ApiException(ErrorCode.UNAUTHORIZED);
        }
        String tokenId = claims.getId();
        if (tokenId == null || tokenId.isBlank()) {
            throw new ApiException(ErrorCode.UNAUTHORIZED);
        }
        try {
            return new RefreshClaims(subjectAsUuid(claims), UUID.fromString(tokenId));
        } catch (IllegalArgumentException e) {
            throw new ApiException(ErrorCode.UNAUTHORIZED);
        }
    }

    public Instant refreshTokenExpiry(String token) {
        return parse(token).getExpiration().toInstant();
    }

    private String buildToken(User user, String type, Duration ttl) {
        return buildToken(user, type, ttl, null);
    }

    private String buildToken(User user, String type, Duration ttl, UUID tokenId) {
        Instant now = Instant.now();
        var builder = Jwts.builder()
                .subject(user.getId().toString())
                .claim("email", user.getEmail())
                .claim("role", user.getRole().name())
                .claim(CLAIM_TYPE, type)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(ttl)));
        if (tokenId != null) {
            builder.id(tokenId.toString());
        }
        return builder.signWith(key).compact();
    }

    private Claims parse(String token) {
        try {
            return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
        } catch (JwtException | IllegalArgumentException e) {
            throw new ApiException(ErrorCode.UNAUTHORIZED);
        }
    }

    private UUID subjectAsUuid(Claims claims) {
        try {
            return UUID.fromString(claims.getSubject());
        } catch (IllegalArgumentException e) {
            throw new ApiException(ErrorCode.UNAUTHORIZED);
        }
    }

    public record RefreshClaims(UUID userId, UUID sessionId) {
    }
}
