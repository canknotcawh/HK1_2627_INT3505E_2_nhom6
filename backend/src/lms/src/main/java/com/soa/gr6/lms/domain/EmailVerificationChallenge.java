package com.soa.gr6.lms.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "email_verification_challenge")
@Getter
@NoArgsConstructor
public class EmailVerificationChallenge {
    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "otp_hash", nullable = false, length = 64)
    private String otpHash;

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "last_sent_at", nullable = false)
    private Instant lastSentAt;

    @Column(name = "consumed_at")
    private Instant consumedAt;

    @Column(name = "failed_attempts", nullable = false)
    private int failedAttempts;

    public EmailVerificationChallenge(UUID id, User user, String otpHash, String tokenHash,
                                     Instant expiresAt, Instant now) {
        this.id = id;
        this.user = user;
        this.otpHash = otpHash;
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
        this.createdAt = now;
        this.updatedAt = now;
        this.lastSentAt = now;
    }

    public boolean isUsableAt(Instant now) {
        return consumedAt == null && expiresAt.isAfter(now);
    }

    public void consume(Instant now) {
        consumedAt = now;
        updatedAt = now;
    }

    public void recordFailedAttempt(Instant now) {
        failedAttempts++;
        updatedAt = now;
    }

    public void replaceChallenge(String otpHash, String tokenHash, Instant expiresAt, Instant now) {
        this.otpHash = otpHash;
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
        this.lastSentAt = now;
        this.failedAttempts = 0;
        this.consumedAt = null;
        this.updatedAt = now;
    }
}
