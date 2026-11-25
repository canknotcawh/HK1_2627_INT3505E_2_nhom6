package com.soa.gr6.lms.dto;

import java.time.Instant;
import java.util.UUID;

/** Một nhóm "một người đọc × một bản PDF": toàn bộ token đã cấp cho cùng user/book. */
public record CanaryGroupSummary(
        BookRef book,
        UserRef user,
        long tokenCount,
        long activeTokenCount,
        long accessCount,
        long distinctIpCount,
        Instant lastSeenAt,
        Instant lastIssuedAt) {

    public record BookRef(UUID id, String title) {
    }

    public record UserRef(UUID id, String email, String fullName) {
    }

    public static CanaryGroupSummary from(CanaryGroupRow row, long distinctIpCount) {
        return new CanaryGroupSummary(
                new BookRef(row.bookId(), row.bookTitle()),
                new UserRef(row.userId(), row.userEmail(), row.userFullName()),
                row.tokenCount(),
                row.activeTokenCount(),
                row.accessCount(),
                distinctIpCount,
                row.lastSeenAt(),
                row.lastIssuedAt());
    }
}
