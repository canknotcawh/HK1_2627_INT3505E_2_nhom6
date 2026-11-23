package com.soa.gr6.lms.dto;

import java.time.Instant;

/** Link đọc PDF có canary token; token thô chỉ xuất hiện đúng một lần ở đây. */
public record CanaryLinkResponse(
        String url,
        Instant expiresAt,
        String tokenSuffix,
        String watermarkText,
        String fileName) {
}
