package com.soa.gr6.lms.dto;

import java.math.BigDecimal;
import java.util.Map;

public record ReviewStatsResponse(
        BigDecimal averageRating,
        long totalReviews,
        Map<Integer, Long> ratingDistribution) {
}

