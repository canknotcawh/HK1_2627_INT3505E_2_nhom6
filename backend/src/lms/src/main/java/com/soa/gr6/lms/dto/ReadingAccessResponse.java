package com.soa.gr6.lms.dto;

import java.time.Instant;
import java.util.UUID;

public record ReadingAccessResponse(
        boolean canRead,
        boolean canPreview,
        UUID loanId,
        Instant dueAt,
        boolean hasFullFile,
        boolean hasPreviewFile) {
}
