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
            "verification email could not be delivered; request a new email and try again"),
    BOOK_FILE_NOT_FOUND(HttpStatus.NOT_FOUND, "book file not found"),
    BOOK_FILE_NOT_AVAILABLE(HttpStatus.CONFLICT, "this book has no PDF for the requested purpose"),
    LOAN_REQUIRED(HttpStatus.FORBIDDEN, "an active loan is required to read this book"),
    CANARY_TOKEN_NOT_FOUND(HttpStatus.NOT_FOUND, "reading link not found"),
    CANARY_TOKEN_EXPIRED(HttpStatus.GONE, "reading link has expired"),
    CANARY_TOKEN_REVOKED(HttpStatus.GONE, "reading link has been revoked"),
    CANARY_FILE_UNAVAILABLE(HttpStatus.GONE, "the stored PDF is no longer available"),
    CANARY_ACCESS_FORBIDDEN(HttpStatus.FORBIDDEN, "you are no longer allowed to read this book"),
    RATE_LIMITED(HttpStatus.TOO_MANY_REQUESTS, "too many requests; try again later"),
    BOOK_FILE_INVALID(HttpStatus.UNPROCESSABLE_CONTENT, "file is not a valid PDF"),
    BOOK_FILE_TYPE_UNSUPPORTED(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "only application/pdf is accepted"),
    BOOK_FILE_TOO_LARGE(HttpStatus.CONTENT_TOO_LARGE, "file exceeds the allowed size");

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
