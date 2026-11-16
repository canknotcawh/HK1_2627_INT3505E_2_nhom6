package com.soa.gr6.lms.exception;

public class ReviewPermissionDeniedException extends DomainException {
    public ReviewPermissionDeniedException() {
        super("REVIEW_FORBIDDEN", "You are not allowed to modify this review");
    }
}

