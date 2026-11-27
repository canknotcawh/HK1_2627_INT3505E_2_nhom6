package com.soa.gr6.lms.dto;

import com.soa.gr6.lms.domain.enums.CanaryPurpose;
import jakarta.validation.constraints.NotNull;

public record ReadingAccessRequest(@NotNull CanaryPurpose purpose) {
}
