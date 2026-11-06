package com.soa.gr6.lms.service;

import com.soa.gr6.lms.dto.ReviewEligibilityResponse;
import com.soa.gr6.lms.dto.ReviewRequest;
import com.soa.gr6.lms.dto.ReviewResponse;
import com.soa.gr6.lms.dto.ReviewStatsResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;
import java.util.UUID;

public interface BookReviewService {

    ReviewEligibilityResponse checkEligibility(UUID userId, UUID bookId);

    ReviewResponse createReview(UUID userId, UUID bookId, ReviewRequest request);

    ReviewResponse updateReview(UUID userId, UUID reviewId, ReviewRequest request);

    void deleteReviewByUser(UUID userId, UUID reviewId);

    void hideReviewByAdmin(UUID reviewId);

    void deleteReviewByAdmin(UUID reviewId);

    ReviewResponse getReview(UUID reviewId);

    Optional<ReviewResponse> getUserReviewForBook(UUID userId, UUID bookId);

    Page<ReviewResponse> listBookReviews(UUID bookId, Pageable pageable);

    Page<ReviewResponse> listUserReviews(UUID userId, Pageable pageable);

    Page<ReviewResponse> listAllReviewsForAdmin(Pageable pageable);

    ReviewStatsResponse getBookReviewStats(UUID bookId);
}

