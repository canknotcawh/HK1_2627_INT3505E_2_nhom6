package com.soa.gr6.lms.domain;

import com.soa.gr6.lms.domain.enums.CanaryReadingEventType;
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

/**
 * Một hành vi của người đọc trên bản PDF (mở, đóng, tải lại, đáng ngờ).
 * Ghi kèm IP thô để admin đối chiếu với lịch sử truy cập.
 */
@Entity
@Table(name = "canary_reading_event")
@Getter
@NoArgsConstructor
public class CanaryReadingEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @Column(name = "token_id", nullable = false)
    private UUID tokenId;

    @Enumerated(EnumType.STRING)
    @Column(name = "event", length = 20, nullable = false)
    private CanaryReadingEventType event;

    @Column(name = "detail", length = 160)
    private String detail;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "ua_hash", length = 64)
    private String uaHash;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    public CanaryReadingEvent(UUID tokenId, CanaryReadingEventType event, String detail,
                              String ipAddress, String uaHash, Instant occurredAt) {
        this.tokenId = tokenId;
        this.event = event;
        this.detail = detail;
        this.ipAddress = ipAddress;
        this.uaHash = uaHash;
        this.occurredAt = occurredAt;
    }
}
