package com.soa.gr6.lms.domain;

import com.soa.gr6.lms.domain.enums.CanaryOutcome;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/** Một lượt truy cập endpoint stream; chỉ lưu hash IP/UA, không lưu giá trị thô. */
@Entity
@Table(name = "canary_access")
@Getter
@NoArgsConstructor
public class CanaryAccess {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @Column(name = "token_id")
    private UUID tokenId;

    @Column(name = "accessed_at", nullable = false)
    private Instant accessedAt;

    @Column(name = "ip_hash", length = 64)
    private String ipHash;

    @Column(name = "ua_hash", length = 64)
    private String uaHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "outcome", length = 20, nullable = false)
    private CanaryOutcome outcome;

    @Column(name = "bytes_sent")
    private Long bytesSent;

    @Column(name = "range_header", length = 50)
    private String rangeHeader;

    @Column(name = "request_id", length = 64)
    private String requestId;

    public CanaryAccess(UUID tokenId, Instant accessedAt, String ipHash, String uaHash, CanaryOutcome outcome,
                        Long bytesSent, String rangeHeader, String requestId) {
        this.tokenId = tokenId;
        this.accessedAt = accessedAt;
        this.ipHash = ipHash;
        this.uaHash = uaHash;
        this.outcome = outcome;
        this.bytesSent = bytesSent;
        this.rangeHeader = rangeHeader;
        this.requestId = requestId;
    }
}
