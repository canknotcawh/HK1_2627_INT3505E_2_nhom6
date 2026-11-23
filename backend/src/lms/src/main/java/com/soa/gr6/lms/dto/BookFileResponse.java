package com.soa.gr6.lms.dto;

import com.soa.gr6.lms.domain.BookFile;
import com.soa.gr6.lms.domain.enums.BookFileKind;

import java.time.Instant;
import java.util.UUID;

/**
 * Metadata của file PDF. Không bao gồm {@code storageKey}.
 */
public record BookFileResponse(
        UUID id,
        BookFileKind kind,
        String originalName,
        String contentType,
        long sizeBytes,
        Integer pageCount,
        String sha256,
        String status,
        Instant createdAt,
        Instant archivedAt) {

    public static BookFileResponse from(BookFile file) {
        return new BookFileResponse(
                file.getId(),
                file.getKind(),
                file.getOriginalName(),
                file.getContentType(),
                file.getSizeBytes(),
                file.getPageCount(),
                file.getSha256(),
                file.getStatus().name(),
                file.getCreatedAt(),
                file.getArchivedAt());
    }
}
