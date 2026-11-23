package com.soa.gr6.lms.dto;

import com.soa.gr6.lms.domain.CanaryAccess;
import com.soa.gr6.lms.domain.enums.CanaryOutcome;

import java.time.Instant;

public record CanaryAccessResponse(
        Long id,
        Instant accessedAt,
        String ipHash,
        String uaHash,
        CanaryOutcome outcome,
        Long bytesSent,
        String rangeHeader,
        String requestId) {

    public static CanaryAccessResponse from(CanaryAccess access) {
        return new CanaryAccessResponse(
                access.getId(),
                access.getAccessedAt(),
                access.getIpHash(),
                access.getUaHash(),
                access.getOutcome(),
                access.getBytesSent(),
                access.getRangeHeader(),
                access.getRequestId());
    }
}
