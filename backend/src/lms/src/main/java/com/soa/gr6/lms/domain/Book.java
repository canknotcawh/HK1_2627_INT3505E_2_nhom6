package com.soa.gr6.lms.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import com.soa.gr6.lms.domain.enums.BookStatus;
import com.soa.gr6.lms.exception.BookUnavailableException;
import com.soa.gr6.lms.exception.InvalidDomainStateException;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "book")
@Getter
@NoArgsConstructor
public class Book {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "isbn13", length = 13, unique = true)
    private String isbn13;

    @Column(name = "title", length = 500, nullable = false)
    private String title;

    @Column(name = "subtitle", length = 500)
    private String subtitle;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Column(name = "language", length = 10)
    private String language;

    @Column(name = "published_year")
    private Integer publishedYear;

    @Column(name = "page_count")
    private Integer pageCount;

    @Column(name = "cover_image_url", length = 1000)
    private String coverImageUrl;

    @Column(name = "preview_url", length = 1000)
    private String previewUrl;

    @Column(name = "reader_url", length = 1000)
    private String readerUrl;

    @Column(name = "total_copies", nullable = false)
    private int totalCopies;

    @Column(name = "available_copies", nullable = false)
    private int availableCopies;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private BookStatus status = BookStatus.ACTIVE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Book(String title) {
        this.title = requireTitle(title);
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    public Book(UUID id, String title) {
        this(title);
        this.id = id;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public void updateMetadata(
            String isbn13,
            String title,
            String subtitle,
            String description,
            String language,
            Integer publishedYear,
            Integer pageCount,
            String coverImageUrl) {
        updateMetadata(
                isbn13,
                title,
                subtitle,
                description,
                language,
                publishedYear,
                pageCount,
                coverImageUrl,
                null,
                null);
    }

    public void updateMetadata(
            String isbn13,
            String title,
            String subtitle,
            String description,
            String language,
            Integer publishedYear,
            Integer pageCount,
            String coverImageUrl,
            String previewUrl,
            String readerUrl) {
        String validTitle = requireTitle(title);
        Integer validPageCount = requireNonNegative(pageCount, "pageCount");
        this.isbn13 = isbn13;
        this.title = validTitle;
        this.subtitle = subtitle;
        this.description = description;
        this.language = language;
        this.publishedYear = publishedYear;
        this.pageCount = validPageCount;
        this.coverImageUrl = coverImageUrl;
        this.previewUrl = previewUrl;
        this.readerUrl = readerUrl;
    }

    public void setCopyCounts(int totalCopies, int availableCopies) {
        if (totalCopies < 0 || availableCopies < 0 || availableCopies > totalCopies) {
            throw new InvalidDomainStateException(
                    "INVALID_COPY_COUNTS", "availableCopies must be between 0 and totalCopies");
        }
        this.totalCopies = totalCopies;
        this.availableCopies = availableCopies;
    }

    public void borrowCopy() {
        if (status != BookStatus.ACTIVE) {
            throw BookUnavailableException.retired();
        }
        if (availableCopies == 0) {
            throw BookUnavailableException.noCopies();
        }
        availableCopies--;
    }

    public void returnCopy() {
        if (availableCopies >= totalCopies) {
            throw new InvalidDomainStateException(
                    "ALL_COPIES_ALREADY_AVAILABLE", "all copies are already available");
        }
        availableCopies++;
    }

    public void retire() {
        status = BookStatus.RETIRED;
    }

    public void activate() {
        status = BookStatus.ACTIVE;
    }

    private static String requireTitle(String title) {
        if (title == null || title.isBlank()) {
            throw new InvalidDomainStateException("BOOK_TITLE_REQUIRED", "title must not be blank");
        }
        return title;
    }

    private static Integer requireNonNegative(Integer value, String fieldName) {
        if (value != null && value < 0) {
            throw new InvalidDomainStateException(
                    "NEGATIVE_" + fieldName.toUpperCase(), fieldName + " must not be negative");
        }
        return value;
    }

}
