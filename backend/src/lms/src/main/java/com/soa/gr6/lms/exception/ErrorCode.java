package com.soa.gr6.lms.exception;

import org.springframework.http.HttpStatus;

public enum ErrorCode {

    VALIDATION_FAILED(HttpStatus.BAD_REQUEST, "invalid request data"),
    ACCOUNT_DISABLED(HttpStatus.FORBIDDEN, "account is disabled"),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "not authenticated or invalid token"),
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "user not found"),
    FORBIDDEN(HttpStatus.FORBIDDEN, "access denied");

    private final HttpStatus status;
    private final String message;

    ErrorCode(HttpStatus status, String message) {
        this.status = status;
        this.message = message;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getMessage() {
        return message;
    }
}
