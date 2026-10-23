package com.soa.gr6.lms.dto;

import java.time.Instant;
import java.util.UUID;

public record BookResponse(
        UUID id,
        String isbn13,
        String title,
        String ggId,
        String description,
        String language,
        Integer publishedYear,
        Integer pageCount,
        String coverImageUrl,
        int totalCopies,
        int availableCopies,
        String status,
        Instant createdAt,
        Instant updatedAt) {
}
