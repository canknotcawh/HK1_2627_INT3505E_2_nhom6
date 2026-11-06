package com.soa.gr6.lms.dto;

public record ReviewEligibilityResponse(
        boolean eligible,
        boolean alreadyReviewed,
        String reason) {

    public static ReviewEligibilityResponse ofEligible() {
        return new ReviewEligibilityResponse(true, false, null);
    }

    public static ReviewEligibilityResponse ofAlreadyReviewed() {
        return new ReviewEligibilityResponse(false, true, "You have already reviewed this book");
    }

    public static ReviewEligibilityResponse ofNotBorrowed() {
        return new ReviewEligibilityResponse(false, false, "You must borrow and return this book before reviewing");
    }
}