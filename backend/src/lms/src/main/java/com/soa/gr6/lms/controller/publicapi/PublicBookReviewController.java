package com.soa.gr6.lms.controller.publicapi;

import com.soa.gr6.lms.dto.ReviewResponse;
import com.soa.gr6.lms.dto.ReviewStatsResponse;
import com.soa.gr6.lms.service.BookReviewService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/public/books/{bookId}/reviews")
public class PublicBookReviewController {

    private final BookReviewService bookReviewService;

    public PublicBookReviewController(BookReviewService bookReviewService) {
        this.bookReviewService = bookReviewService;
    }

    @GetMapping
    public Page<ReviewResponse> listReviews(
            @PathVariable UUID bookId,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return bookReviewService.listBookReviews(bookId, pageable);
    }

    @GetMapping("/stats")
    public ReviewStatsResponse getReviewStats(@PathVariable UUID bookId) {
        return bookReviewService.getBookReviewStats(bookId);
    }
}

