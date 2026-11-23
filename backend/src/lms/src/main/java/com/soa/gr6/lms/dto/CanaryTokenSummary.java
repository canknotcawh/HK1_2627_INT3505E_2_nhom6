package com.soa.gr6.lms.dto;

import com.soa.gr6.lms.domain.CanaryToken;
import com.soa.gr6.lms.domain.enums.CanaryPurpose;
import com.soa.gr6.lms.domain.enums.CanaryTokenStatus;

import java.time.Instant;
import java.util.UUID;

/** Không chứa token thô hay storage key; chỉ prefix để admin nhìn và tìm. */
public record CanaryTokenSummary(
        UUID id,
        String tokenPrefix,
        BookRef book,
        UserRef user,
        UUID loanId,
        CanaryPurpose purpose,
        Instant issuedAt,
        Instant expiresAt,
        Instant revokedAt,
        Instant lastSeenAt,
        int accessCount,
        long distinctIpCount,
        CanaryTokenStatus status) {

    public record BookRef(UUID id, String title) {
    }

    public record UserRef(UUID id, String email, String fullName) {
    }

    public static CanaryTokenSummary of(CanaryToken token, Instant now, long distinctIpCount) {
        return new CanaryTokenSummary(
                token.getId(),
                token.getTokenPrefix(),
                new BookRef(token.getBook().getId(), token.getBook().getTitle()),
                new UserRef(token.getUser().getId(), token.getUser().getEmail(), token.getUser().getFullName()),
                token.getLoan() == null ? null : token.getLoan().getId(),
                token.getPurpose(),
                token.getIssuedAt(),
                token.getExpiresAt(),
                token.getRevokedAt(),
                token.getLastSeenAt(),
                token.getAccessCount(),
                distinctIpCount,
                token.status(now));
    }
}
