package com.soa.gr6.lms.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.soa.gr6.lms.controller.admin.AdminBookReviewController;
import com.soa.gr6.lms.controller.publicapi.PublicBookReviewController;
import com.soa.gr6.lms.controller.user.BookReviewController;
import com.soa.gr6.lms.domain.enums.UserRole;
import com.soa.gr6.lms.dto.ReviewEligibilityResponse;
import com.soa.gr6.lms.dto.ReviewRequest;
import com.soa.gr6.lms.dto.ReviewResponse;
import com.soa.gr6.lms.dto.ReviewStatsResponse;
import com.soa.gr6.lms.exception.GlobalExceptionHandler;
import com.soa.gr6.lms.security.AuthenticatedUser;
import com.soa.gr6.lms.service.BookReviewService;

class BookReviewControllersWebTest {

    private final BookReviewService reviewService = mock(BookReviewService.class);

    private final UUID userId = UUID.randomUUID();
    private final UUID bookId = UUID.randomUUID();
    private final UUID reviewId = UUID.randomUUID();

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(
                        new AuthenticatedUser(userId, "reader@test.com", UserRole.USER), "n/a", List.of()));

        mvc = MockMvcBuilders.standaloneSetup(
                        new PublicBookReviewController(reviewService),
                        new BookReviewController(reviewService),
                        new AdminBookReviewController(reviewService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(
                        new PageableHandlerMethodArgumentResolver(),
                        new AuthenticationPrincipalArgumentResolver())
                .build();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private ReviewResponse sampleReview() {
        return new ReviewResponse(
                reviewId,
                bookId,
                userId,
                "Alice",
                5,
                "Great read!",
                "VISIBLE",
                Instant.now(),
                Instant.now());
    }

    @Test
    void publicGetBookReviewsReturnsPage() throws Exception {
        when(reviewService.listBookReviews(eq(bookId), any()))
                .thenReturn(new PageImpl<>(List.of(sampleReview()), PageRequest.of(0, 10), 1));

        mvc.perform(get("/api/v1/public/books/" + bookId + "/reviews"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(reviewId.toString()))
                .andExpect(jsonPath("$.content[0].rating").value(5))
                .andExpect(jsonPath("$.content[0].comment").value("Great read!"));
    }

    @Test
    void publicGetBookReviewStatsReturnsStats() throws Exception {
        ReviewStatsResponse stats = new ReviewStatsResponse(
                new BigDecimal("4.50"),
                10L,
                Map.of(5, 6L, 4, 3L, 3, 1L, 2, 0L, 1, 0L));
        when(reviewService.getBookReviewStats(bookId)).thenReturn(stats);

        mvc.perform(get("/api/v1/public/books/" + bookId + "/reviews/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.averageRating").value(4.5))
                .andExpect(jsonPath("$.totalReviews").value(10))
                .andExpect(jsonPath("$.ratingDistribution['5']").value(6));
    }

    @Test
    void checkEligibilityReturnsStatus() throws Exception {
        when(reviewService.checkEligibility(userId, bookId))
                .thenReturn(ReviewEligibilityResponse.ofEligible());

        mvc.perform(get("/api/v1/books/" + bookId + "/reviews/eligibility"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eligible").value(true))
                .andExpect(jsonPath("$.alreadyReviewed").value(false));
    }

    @Test
    void createReviewValidRequestReturns201() throws Exception {
        when(reviewService.createReview(eq(userId), eq(bookId), any(ReviewRequest.class)))
                .thenReturn(sampleReview());

        String json = "{\"rating\":5,\"comment\":\"This book is an absolute masterpiece!\"}";

        mvc.perform(post("/api/v1/books/" + bookId + "/reviews")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(reviewId.toString()))
                .andExpect(jsonPath("$.rating").value(5));
    }

    @Test
    void createReviewInvalidRatingReturns400() throws Exception {
        String json = "{\"rating\":0,\"comment\":\"Too low rating\"}";

        mvc.perform(post("/api/v1/books/" + bookId + "/reviews")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getMyReviewReturnsReviewWhenExists() throws Exception {
        when(reviewService.getUserReviewForBook(userId, bookId))
                .thenReturn(Optional.of(sampleReview()));

        mvc.perform(get("/api/v1/books/" + bookId + "/reviews/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(reviewId.toString()));
    }

    @Test
    void getMyReviewReturns404WhenNotFound() throws Exception {
        when(reviewService.getUserReviewForBook(userId, bookId))
                .thenReturn(Optional.empty());

        mvc.perform(get("/api/v1/books/" + bookId + "/reviews/me"))
                .andExpect(status().isNotFound());
    }

    @Test
    void updateReviewReturnsUpdatedResponse() throws Exception {
        when(reviewService.updateReview(eq(userId), eq(reviewId), any(ReviewRequest.class)))
                .thenReturn(sampleReview());

        String json = "{\"rating\":4,\"comment\":\"Still quite good after reread.\"}";

        mvc.perform(put("/api/v1/reviews/" + reviewId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(reviewId.toString()));
    }

    @Test
    void deleteReviewReturns204NoContent() throws Exception {
        mvc.perform(delete("/api/v1/reviews/" + reviewId))
                .andExpect(status().isNoContent());

        verify(reviewService).deleteReviewByUser(userId, reviewId);
    }

    @Test
    void adminHideReviewReturns200() throws Exception {
        mvc.perform(patch("/api/v1/admin/reviews/" + reviewId + "/hide"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Review has been hidden successfully"));

        verify(reviewService).hideReviewByAdmin(reviewId);
    }

    @Test
    void adminRestoreReviewReturns200() throws Exception {
        mvc.perform(patch("/api/v1/admin/reviews/" + reviewId + "/restore"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Review has been restored successfully"));

        verify(reviewService).restoreReviewByAdmin(reviewId);
    }

    @Test
    void adminDeleteReviewReturns204() throws Exception {
        mvc.perform(delete("/api/v1/admin/reviews/" + reviewId))
                .andExpect(status().isNoContent());

        verify(reviewService).deleteReviewByAdmin(reviewId);
    }
}

