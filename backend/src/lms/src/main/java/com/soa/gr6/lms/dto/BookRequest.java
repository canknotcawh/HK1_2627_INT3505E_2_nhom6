package com.soa.gr6.lms.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BookRequest(
        @Size(max = 13) String isbn13,
        @NotBlank @Size(max = 500) String title,
        @Size(max = 500) String subtitle,
        String description,
        @Size(max = 10) String language,
        Integer publishedYear,
        @Min(0) Integer pageCount,
        @Size(max = 1000) String coverImageUrl,
        @Size(max = 1000) String previewUrl,
        @Size(max = 1000) String readerUrl,
        @Min(0) int totalCopies) {
}
