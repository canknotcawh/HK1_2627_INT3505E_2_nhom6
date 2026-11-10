package com.soa.gr6.lms.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record BookRequest(
        @Size(max = 13) String isbn13,
        @NotBlank @Size(max = 500) String title,
        @Size(max = 500) String subtitle,
        String description,
        @Size(max = 10) String language,
        Integer publishedYear,
        @Min(0) Integer pageCount,
        @Size(max = 1000) String coverImageUrl,
        @Min(0) int totalCopies,
        @Size(min = 12, max = 12) String ggId,
        List<@NotBlank @Size(max = 100) String> categories) {

    public BookRequest(String isbn13, String title, String subtitle, String description,
            String language, Integer publishedYear, Integer pageCount, String coverImageUrl,
            int totalCopies) {
        this(isbn13, title, subtitle, description, language, publishedYear, pageCount,
                coverImageUrl, totalCopies, null, null);
    }
}
