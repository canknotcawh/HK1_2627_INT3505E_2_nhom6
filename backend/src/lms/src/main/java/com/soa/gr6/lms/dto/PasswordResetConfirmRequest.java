package com.soa.gr6.lms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import com.soa.gr6.lms.validation.StrongPassword;

public record PasswordResetConfirmRequest(
        @NotBlank String token,
        @NotBlank @Size(min = 8, max = 100) @StrongPassword String newPassword) {
}
