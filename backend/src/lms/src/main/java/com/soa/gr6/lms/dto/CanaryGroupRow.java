package com.soa.gr6.lms.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * Kết quả truy vấn tổng hợp theo cặp (người đọc, sách). Phẳng để dùng trực tiếp trong
 * constructor expression của JPQL; service chuyển thành {@link CanaryGroupSummary}.
 */
public record CanaryGroupRow(
        UUID bookId,
        String bookTitle,
        UUID userId,
        String userEmail,
        String userFullName,
        long tokenCount,
        long accessCount,
        long activeTokenCount,
        Instant lastSeenAt,
        Instant lastIssuedAt) {
}
