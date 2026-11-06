package com.soa.gr6.lms.exception;

public class ReviewNotEligibleException extends DomainException {
    public ReviewNotEligibleException(String message) {
        super("REVIEW_NOT_ELIGIBLE", message);
    }
}

