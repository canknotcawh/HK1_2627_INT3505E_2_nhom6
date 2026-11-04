package com.soa.gr6.lms.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record EmailVerificationConfirmRequest(
        @Email @Size(max = 255) String email,
        @Pattern(regexp = "[0-9]{6}") String code,
        @Size(max = 128) String token) {

    @AssertTrue(message = "provide either email and code, or token")
    public boolean isValidCombination() {
        boolean hasToken = token != null && !token.isBlank();
        boolean hasCode = code != null && !code.isBlank();
        boolean hasEmail = email != null && !email.isBlank();
        return hasToken ? !hasCode && !hasEmail : hasCode && hasEmail;
    }
}
