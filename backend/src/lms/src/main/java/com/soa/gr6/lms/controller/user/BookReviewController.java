package com.soa.gr6.lms.controller.user;

import com.soa.gr6.lms.dto.ReviewEligibilityResponse;
import com.soa.gr6.lms.dto.ReviewRequest;
import com.soa.gr6.lms.dto.ReviewResponse;
import com.soa.gr6.lms.security.AuthenticatedUser;
import com.soa.gr6.lms.service.BookReviewService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
public class BookReviewController {

    private final BookReviewService bookReviewService;

    public BookReviewController(BookReviewService bookReviewService) {
        this.bookReviewService = bookReviewService;
    }

    @PostMapping("/api/v1/books/{bookId}/reviews")
    @ResponseStatus(HttpStatus.CREATED)
    public ReviewResponse createReview(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID bookId,
            @Valid @RequestBody ReviewRequest request) {
        return bookReviewService.createReview(principal.id(), bookId, request);
    }

    @GetMapping("/api/v1/books/{bookId}/reviews/eligibility")
    public ReviewEligibilityResponse checkEligibility(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID bookId) {
        return bookReviewService.checkEligibility(principal.id(), bookId);
    }

    @GetMapping("/api/v1/books/{bookId}/reviews/me")
    public ResponseEntity<ReviewResponse> getMyReviewForBook(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID bookId) {
        return bookReviewService.getUserReviewForBook(principal.id(), bookId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/api/v1/users/me/reviews")
    public Page<ReviewResponse> listMyReviews(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return bookReviewService.listUserReviews(principal.id(), pageable);
    }

    @PutMapping("/api/v1/reviews/{reviewId}")
    public ReviewResponse updateReview(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID reviewId,
            @Valid @RequestBody ReviewRequest request) {
        return bookReviewService.updateReview(principal.id(), reviewId, request);
    }

    @DeleteMapping("/api/v1/reviews/{reviewId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteReview(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID reviewId) {
        bookReviewService.deleteReviewByUser(principal.id(), reviewId);
    }
}

