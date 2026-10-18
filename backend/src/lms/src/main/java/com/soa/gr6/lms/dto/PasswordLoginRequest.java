package com.soa.gr6.lms.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record PasswordLoginRequest(
        @NotBlank @Email String email,
        @NotBlank String password) {
}
