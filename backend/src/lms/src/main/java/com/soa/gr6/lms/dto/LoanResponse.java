package com.soa.gr6.lms.dto;

import java.time.Instant;
import java.util.UUID;

public record LoanResponse(
        UUID id,
        UUID bookId,
        String bookTitle,
        UUID userId,
        Instant borrowedAt,
        Instant dueAt,
        Instant returnedAt,
        String status,
        int renewedCount) {
}
