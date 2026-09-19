package com.soa.gr6.lms.exception;

import org.springframework.http.HttpStatus;

public enum ErrorCode {

    VALIDATION_FAILED(HttpStatus.BAD_REQUEST, "invalid request data"),
    EMAIL_EXISTS(HttpStatus.CONFLICT, "email already exists"),
    BAD_CREDENTIALS(HttpStatus.UNAUTHORIZED, "invalid email or password"),
    ACCOUNT_LOCKED(HttpStatus.LOCKED, "too many failed login attempts, please try again later"),
    ACCOUNT_DISABLED(HttpStatus.FORBIDDEN, "account is disabled"),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "not authenticated or invalid token"),
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "user not found");

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
