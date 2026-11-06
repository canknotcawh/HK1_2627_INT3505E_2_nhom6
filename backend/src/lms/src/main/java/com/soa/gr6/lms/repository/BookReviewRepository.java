package com.soa.gr6.lms.repository;

import com.soa.gr6.lms.domain.BookReview;
import com.soa.gr6.lms.domain.enums.ReviewStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface BookReviewRepository extends JpaRepository<BookReview, UUID> {

    Optional<BookReview> findByBookIdAndUserId(UUID bookId, UUID userId);

    boolean existsByBookIdAndUserId(UUID bookId, UUID userId);

    Page<BookReview> findByBookIdAndStatus(UUID bookId, ReviewStatus status, Pageable pageable);

    Page<BookReview> findByUserId(UUID userId, Pageable pageable);

    @Query("SELECT AVG(r.rating) FROM BookReview r WHERE r.book.id = :bookId AND r.status = :status")
    Double findAverageRatingByBookIdAndStatus(@Param("bookId") UUID bookId, @Param("status") ReviewStatus status);

    long countByBookIdAndStatus(UUID bookId, ReviewStatus status);

    @Query("SELECT r.rating, COUNT(r) FROM BookReview r WHERE r.book.id = :bookId AND r.status = :status GROUP BY r.rating")
    java.util.List<Object[]> countRatingDistributionByBookIdAndStatus(@Param("bookId") UUID bookId, @Param("status") ReviewStatus status);
}

