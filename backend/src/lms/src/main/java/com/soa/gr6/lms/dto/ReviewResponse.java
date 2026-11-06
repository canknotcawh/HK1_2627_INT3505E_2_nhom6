package com.soa.gr6.lms.dto;

import java.time.Instant;
import java.util.UUID;

public record ReviewResponse(
        UUID id,
        UUID bookId,
        UUID userId,
        String userName,
        int rating,
        String comment,
        String status,
        Instant createdAt,
        Instant updatedAt) {
}

