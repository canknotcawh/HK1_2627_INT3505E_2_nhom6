package com.soa.gr6.lms.dto;

import com.soa.gr6.lms.domain.SecurityEventLog;
import com.soa.gr6.lms.domain.enums.SecurityEventSeverity;
import com.soa.gr6.lms.domain.enums.SecurityEventType;

import java.time.Instant;
import java.util.UUID;

public record SecurityEventResponse(
        UUID id,
        UUID userId,
        String userEmail,
        SecurityEventType eventType,
        SecurityEventSeverity severity,
        String pageUrl,
        UUID bookId,
        String bookTitle,
        String details,
        String ipAddress,
        String userAgent,
        Instant createdAt
) {
    public static SecurityEventResponse from(SecurityEventLog log) {
        return new SecurityEventResponse(
                log.getId(),
                log.getUser() != null ? log.getUser().getId() : null,
                log.getUserEmail(),
                log.getEventType(),
                log.getSeverity(),
                log.getPageUrl(),
                log.getBookId(),
                log.getBookTitle(),
                log.getDetails(),
                log.getIpAddress(),
                log.getUserAgent(),
                log.getCreatedAt()
        );
    }
}

