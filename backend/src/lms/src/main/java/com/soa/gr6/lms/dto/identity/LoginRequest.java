package com.soa.gr6.lms.dto.identity;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(

        @NotBlank(message = "email cannot be blank")
        String email,

        @NotBlank(message = "password cannot be blank")
        String password) {
}
