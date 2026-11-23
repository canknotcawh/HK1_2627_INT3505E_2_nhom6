package com.soa.gr6.lms.dto;

import java.util.List;

public record CanaryLookupResult(
        boolean matched,
        String matchType,
        List<CanaryTokenSummary> tokens,
        List<String> signals) {
}
