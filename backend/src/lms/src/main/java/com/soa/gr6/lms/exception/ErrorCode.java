package com.soa.gr6.lms.exception;

import org.springframework.http.HttpStatus;

public enum ErrorCode {

    VALIDATION_FAILED(HttpStatus.BAD_REQUEST, "invalid request data"),
    ACCOUNT_DISABLED(HttpStatus.FORBIDDEN, "account is disabled"),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "not authenticated or invalid token"),
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "user not found"),
    FORBIDDEN(HttpStatus.FORBIDDEN, "access denied"),
    PASSWORD_MISMATCH(HttpStatus.BAD_REQUEST, "current password is incorrect"),
    GOOGLE_ACCOUNT_ONLY(HttpStatus.CONFLICT, "this account signs in with Google"),
    EMAIL_NOT_VERIFIED(HttpStatus.FORBIDDEN, "verify your email before signing in"),
    EMAIL_VERIFICATION_INVALID(HttpStatus.BAD_REQUEST, "verification code or link is invalid or expired"),
    EMAIL_VERIFICATION_DELIVERY_FAILED(HttpStatus.SERVICE_UNAVAILABLE,
            "verification email could not be delivered; request a new email and try again");

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
