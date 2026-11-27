package com.soa.gr6.lms.dto;

import com.soa.gr6.lms.domain.enums.SecurityEventSeverity;
import com.soa.gr6.lms.domain.enums.SecurityEventType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record SecurityEventRequest(
        @NotNull(message = "Event type is required")
        SecurityEventType eventType,

        @NotNull(message = "Severity is required")
        SecurityEventSeverity severity,

        @Size(max = 1000, message = "Page URL must not exceed 1000 characters")
        String pageUrl,

        UUID bookId,

        @Size(max = 500, message = "Book title must not exceed 500 characters")
        String bookTitle,

        @Size(max = 2000, message = "Details must not exceed 2000 characters")
        String details
) {
}

