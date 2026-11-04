package com.soa.gr6.lms.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import com.soa.gr6.lms.validation.StrongPassword;

public record RegisterRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, max = 100) @StrongPassword String password,
        @NotBlank @Size(max = 255) String fullName) {
}
