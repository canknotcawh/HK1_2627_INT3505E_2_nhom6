package com.soa.gr6.lms.controller.admin;

import com.soa.gr6.lms.dto.MessageResponse;
import com.soa.gr6.lms.dto.ReviewResponse;
import com.soa.gr6.lms.service.BookReviewService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/reviews")
public class AdminBookReviewController {

    private final BookReviewService bookReviewService;

    public AdminBookReviewController(BookReviewService bookReviewService) {
        this.bookReviewService = bookReviewService;
    }

    @GetMapping
    public Page<ReviewResponse> listAllReviews(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return bookReviewService.listAllReviewsForAdmin(pageable);
    }

    @PatchMapping("/{reviewId}/hide")
    public MessageResponse hideReview(@PathVariable UUID reviewId) {
        bookReviewService.hideReviewByAdmin(reviewId);
        return new MessageResponse("Review has been hidden successfully");
    }

    @DeleteMapping("/{reviewId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteReview(@PathVariable UUID reviewId) {
        bookReviewService.deleteReviewByAdmin(reviewId);
    }
}

