package com.soa.gr6.lms.domain;

import com.soa.gr6.lms.domain.enums.BookFileKind;
import com.soa.gr6.lms.domain.enums.BookFileStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * Một file PDF gốc của sách. {@code storageKey} chỉ tồn tại phía server: client
 * không bao giờ nhận được đường dẫn storage, chỉ nhận id file.
 */
@Entity
@Table(name = "book_file")
@Getter
@NoArgsConstructor
public class BookFile {

    @Id
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "book_id", nullable = false)
    private Book book;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", length = 10, nullable = false)
    private BookFileKind kind;

    @Column(name = "storage_key", length = 500, nullable = false, unique = true)
    private String storageKey;

    @Column(name = "original_name", length = 255, nullable = false)
    private String originalName;

    @Column(name = "content_type", length = 100, nullable = false)
    private String contentType;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Column(name = "sha256", length = 64, nullable = false)
    private String sha256;

    @Column(name = "page_count")
    private Integer pageCount;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private BookFileStatus status = BookFileStatus.ACTIVE;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "archived_at")
    private Instant archivedAt;

    public BookFile(UUID id, Book book, BookFileKind kind, String storageKey, String originalName,
                    String contentType, long sizeBytes, String sha256, Integer pageCount, UUID createdBy) {
        this.id = id;
        this.book = book;
        this.kind = kind;
        this.storageKey = storageKey;
        this.originalName = originalName;
        this.contentType = contentType;
        this.sizeBytes = sizeBytes;
        this.sha256 = sha256;
        this.pageCount = pageCount;
        this.createdBy = createdBy;
        this.createdAt = Instant.now();
    }

    public boolean isActive() {
        return status == BookFileStatus.ACTIVE;
    }

    /** File bị thay thế/ngừng dùng: không xoá vật lý, chỉ đánh dấu. */
    public void archive() {
        if (status == BookFileStatus.ARCHIVED) {
            return;
        }
        status = BookFileStatus.ARCHIVED;
        archivedAt = Instant.now();
    }
}
