package com.soa.gr6.lms.mapper;

import com.soa.gr6.lms.domain.BookReview;
import com.soa.gr6.lms.dto.ReviewResponse;
import org.springframework.stereotype.Component;

@Component
public class BookReviewMapper {

    public ReviewResponse toResponse(BookReview review) {
        return new ReviewResponse(
                review.getId(),
                review.getBook().getId(),
                review.getUser().getId(),
                review.getUser().getFullName(),
                review.getRating(),
                review.getComment(),
                review.getStatus().name(),
                review.getCreatedAt(),
                review.getUpdatedAt()
        );
    }
}

