package com.soa.gr6.lms.dto;

public record BookRequest(
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
        int totalCopies) {
}
