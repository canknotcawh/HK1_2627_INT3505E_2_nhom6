package com.soa.gr6.lms.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CanaryRevokeForUserRequest(@NotNull UUID userId, UUID bookId) {
}
