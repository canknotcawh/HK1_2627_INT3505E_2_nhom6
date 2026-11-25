package com.soa.gr6.lms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CanaryReadingEventRequest(
        @NotBlank
        @Pattern(regexp = "OPEN|CLOSE|RELOAD|SUSPICIOUS", message = "unknown reading event")
        String event,
        @Size(max = 160) String detail) {
}
