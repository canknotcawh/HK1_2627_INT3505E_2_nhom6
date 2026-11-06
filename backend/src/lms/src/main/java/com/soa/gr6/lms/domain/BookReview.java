package com.soa.gr6.lms.domain;

import com.soa.gr6.lms.domain.enums.ReviewStatus;
import com.soa.gr6.lms.exception.InvalidDomainStateException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
        name = "book_review",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_book_review_book_user", columnNames = {"book_id", "user_id"})
        },
        indexes = {
                @Index(name = "idx_book_review_book_status_created", columnList = "book_id, status, created_at"),
                @Index(name = "idx_book_review_user", columnList = "user_id")
        }
)
@Getter
@NoArgsConstructor
public class BookReview {

    public static final int MIN_RATING = 1;
    public static final int MAX_RATING = 5;
    public static final int MIN_COMMENT_LENGTH = 10;
    public static final int MAX_COMMENT_LENGTH = 1000;

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "book_id", nullable = false)
    private Book book;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "rating", nullable = false)
    private int rating;

    @Column(name = "comment", columnDefinition = "text")
    private String comment;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private ReviewStatus status = ReviewStatus.VISIBLE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public BookReview(Book book, User user, int rating, String comment) {
        if (book == null || user == null) {
            throw new InvalidDomainStateException("REVIEW_TARGET_REQUIRED", "book and user are required");
        }
        validateRating(rating);
        String normalizedComment = validateAndNormalizeComment(comment);

        this.book = book;
        this.user = user;
        this.rating = rating;
        this.comment = normalizedComment;
        this.status = ReviewStatus.VISIBLE;
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void update(int rating, String comment) {
        if (this.status != ReviewStatus.VISIBLE) {
            throw new InvalidDomainStateException("REVIEW_INACTIVE", "cannot update an inactive or hidden review");
        }
        validateRating(rating);
        this.comment = validateAndNormalizeComment(comment);
        this.rating = rating;
        this.updatedAt = Instant.now();
    }

    public void hideByAdmin() {
        this.status = ReviewStatus.HIDDEN_BY_ADMIN;
        this.updatedAt = Instant.now();
    }

    public void deleteByUser() {
        this.status = ReviewStatus.DELETED;
        this.updatedAt = Instant.now();
    }

    public void restore() {
        this.status = ReviewStatus.VISIBLE;
        this.updatedAt = Instant.now();
    }

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    private static void validateRating(int rating) {
        if (rating < MIN_RATING || rating > MAX_RATING) {
            throw new InvalidDomainStateException("RATING_OUT_OF_RANGE", "Rating must be between 1 and 5");
        }
    }

    private static String validateAndNormalizeComment(String comment) {
        if (comment == null) {
            return null;
        }
        String trimmed = comment.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        if (trimmed.length() < MIN_COMMENT_LENGTH || trimmed.length() > MAX_COMMENT_LENGTH) {
            throw new InvalidDomainStateException(
                    "COMMENT_LENGTH_INVALID",
                    "Comment must be between " + MIN_COMMENT_LENGTH + " and " + MAX_COMMENT_LENGTH + " characters"
            );
        }
        return trimmed;
    }
}

