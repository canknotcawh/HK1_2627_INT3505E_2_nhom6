package com.soa.gr6.lms.dto;

import com.soa.gr6.lms.domain.enums.CanaryRevokeReason;

/** Lý do mặc định là ADMIN khi admin thu hồi từ giao diện. */
public record CanaryRevokeRequest(CanaryRevokeReason reason) {

    public CanaryRevokeReason reasonOrDefault() {
        return reason == null ? CanaryRevokeReason.ADMIN : reason;
    }
}
