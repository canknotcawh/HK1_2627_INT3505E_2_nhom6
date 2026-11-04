package com.soa.gr6.lms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(@NotBlank @Size(max = 255) String fullName) {
    public UpdateProfileRequest {
        if (fullName != null) {
            fullName = fullName.trim();
        }
    }
}
