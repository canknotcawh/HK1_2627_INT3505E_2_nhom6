package com.soa.gr6.lms.dto;

import java.time.Instant;
import java.util.UUID;

public record BookResponse(
        UUID id,
        String isbn13,
        String title,
        String subtitle,
        String description,
        String language,
        Integer publishedYear,
        Integer pageCount,
        String coverImageUrl,
        String previewUrl,
        String readerUrl,
        int totalCopies,
        int availableCopies,
        String status,
        Instant createdAt,
        Instant updatedAt) {
}
