package com.soa.gr6.lms.dto;

import java.util.List;
import java.util.UUID;

public record CanaryTokenDetail(
        CanaryTokenSummary summary,
        String revokeReason,
        String createdIpHash,
        String createdUaHash,
        FileRef file,
        List<String> riskFlags) {

    public record FileRef(UUID id, String kind, String originalName, long sizeBytes, String sha256) {
    }
}
