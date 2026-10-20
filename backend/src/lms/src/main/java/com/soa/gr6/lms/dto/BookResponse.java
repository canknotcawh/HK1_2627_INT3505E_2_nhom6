package com.soa.gr6.lms.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
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
        BigDecimal ratingAvg,
        int ratingCount,
        String status,
        Instant createdAt,
        Instant updatedAt,
        List<String> authors,
        List<String> categories) {

    public BookResponse(
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
        this(id, isbn13, title, subtitle, description, language, publishedYear, pageCount,
                coverImageUrl, previewUrl, readerUrl, totalCopies, availableCopies,
                BigDecimal.ZERO, 0, status, createdAt, updatedAt, List.of(), List.of());
    }
}
