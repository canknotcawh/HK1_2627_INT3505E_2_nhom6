package com.soa.gr6.lms.exception;

import java.util.UUID;

public class ReviewNotFoundException extends DomainException {
    public ReviewNotFoundException(UUID reviewId) {
        super("REVIEW_NOT_FOUND", "Review not found: " + reviewId);
    }
}

