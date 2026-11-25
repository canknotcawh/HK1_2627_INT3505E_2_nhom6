package com.soa.gr6.lms.domain;

import com.soa.gr6.lms.domain.enums.CanaryPurpose;
import com.soa.gr6.lms.domain.enums.CanaryRevokeReason;
import com.soa.gr6.lms.domain.enums.CanaryTokenStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * Một liên kết đọc PDF có thể truy vết. DB chỉ giữ SHA-256 của token thô, nên
 * token không thể bị đọc ngược từ database hay log.
 */
@Entity
@Table(name = "canary_token")
@Getter
@NoArgsConstructor
public class CanaryToken {

    @Id
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "token_hash", length = 64, nullable = false, unique = true)
    private String tokenHash;

    @Column(name = "token_prefix", length = 12, nullable = false)
    private String tokenPrefix;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "book_id", nullable = false)
    private Book book;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "file_id", nullable = false)
    private BookFile file;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loan_id")
    private Loan loan;

    @Enumerated(EnumType.STRING)
    @Column(name = "purpose", length = 10, nullable = false)
    private CanaryPurpose purpose;

    @Column(name = "issued_at", nullable = false, updatable = false)
    private Instant issuedAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "revoke_reason", length = 100)
    private CanaryRevokeReason revokeReason;

    @Column(name = "revoked_by")
    private UUID revokedBy;

    @Column(name = "last_seen_at")
    private Instant lastSeenAt;

    @Column(name = "access_count", nullable = false)
    private int accessCount;

    @Column(name = "created_ip_address", length = 45)
    private String createdIpAddress;

    @Column(name = "created_ip_hash", length = 64)
    private String createdIpHash;

    @Column(name = "created_ua_hash", length = 64)
    private String createdUaHash;

    public CanaryToken(UUID id, String tokenHash, String tokenPrefix, Book book, BookFile file,
                       User user, Loan loan, CanaryPurpose purpose, Instant issuedAt, Instant expiresAt,
                       String createdIpAddress, String createdIpHash, String createdUaHash) {
        this.id = id;
        this.tokenHash = tokenHash;
        this.tokenPrefix = tokenPrefix;
        this.book = book;
        this.file = file;
        this.user = user;
        this.loan = loan;
        this.purpose = purpose;
        this.issuedAt = issuedAt;
        this.expiresAt = expiresAt;
        this.createdIpAddress = createdIpAddress;
        this.createdIpHash = createdIpHash;
        this.createdUaHash = createdUaHash;
    }

    public boolean isRevoked() {
        return revokedAt != null;
    }

    public boolean isExpired(Instant now) {
        return !now.isBefore(expiresAt);
    }

    public CanaryTokenStatus status(Instant now) {
        if (isRevoked()) {
            return CanaryTokenStatus.REVOKED;
        }
        return isExpired(now) ? CanaryTokenStatus.EXPIRED : CanaryTokenStatus.ACTIVE;
    }

    /** Thu hồi tức thì; gọi nhiều lần không đổi mốc thời gian đầu tiên. */
    public void revoke(CanaryRevokeReason reason, UUID revokedBy, Instant now) {
        if (isRevoked()) {
            return;
        }
        this.revokedAt = now;
        this.revokeReason = reason;
        this.revokedBy = revokedBy;
    }

    public void registerAccess(Instant now) {
        this.lastSeenAt = now;
        this.accessCount++;
    }
}
