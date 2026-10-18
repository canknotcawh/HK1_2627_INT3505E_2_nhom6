package com.soa.gr6.lms.exception;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class ErrorModelTest {

    @Test
    void apiErrorFromErrorCode() {
        ApiError error = ApiError.of(ErrorCode.FORBIDDEN);
        assertThat(error.status()).isEqualTo(403);
        assertThat(error.code()).isEqualTo("FORBIDDEN");
        assertThat(error.fieldErrors()).isNull();
        assertThat(error.timestamp()).isNotNull();
    }

    @Test
    void apiErrorKeepsFieldErrors() {
        ApiError error = ApiError.of(ErrorCode.VALIDATION_FAILED, Map.of("title", "must not be blank"));
        assertThat(error.fieldErrors()).containsEntry("title", "must not be blank");
        assertThat(ApiError.of(HttpStatus.CONFLICT, "X", "m").status()).isEqualTo(409);
    }

    @Test
    void exceptionsCarryCodes() {
        assertThat(new ApiException(ErrorCode.UNAUTHORIZED).getErrorCode().getStatus())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(new BookNotFoundException(UUID.randomUUID()).getCode()).isEqualTo("BOOK_NOT_FOUND");
        assertThat(new LoanNotFoundException(UUID.randomUUID()).getCode()).isEqualTo("LOAN_NOT_FOUND");
        assertThat(new UserSuspendedException().getCode()).isEqualTo("USER_SUSPENDED");
        assertThat(BookUnavailableException.noCopies().getCode()).isEqualTo("NO_COPIES_AVAILABLE");
        assertThat(BookUnavailableException.retired().getCode()).isEqualTo("BOOK_RETIRED");
        assertThat(new DomainException("C", "m", new RuntimeException()).getCause()).isNotNull();
    }
}
