package com.soa.gr6.lms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import com.soa.gr6.lms.validation.StrongPassword;

public record ChangePasswordRequest(
        @NotBlank String currentPassword,
        @NotBlank @Size(min = 8, max = 100) @StrongPassword String newPassword) {
}
