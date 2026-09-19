package com.soa.gr6.lms.exception;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiError(int status, String code, String message, Instant timestamp, Map<String, String> fieldErrors) {

    public static ApiError of(ErrorCode errorCode) {
        return of(errorCode, null);
    }

    public static ApiError of(ErrorCode errorCode, Map<String, String> fieldErrors) {
        return new ApiError(
                errorCode.getStatus().value(),
                errorCode.name(),
                errorCode.getMessage(),
                Instant.now(),
                fieldErrors);
    }
}