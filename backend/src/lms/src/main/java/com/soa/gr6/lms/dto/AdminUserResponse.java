package com.soa.gr6.lms.dto;

import java.time.Instant;
import java.util.UUID;

import com.soa.gr6.lms.domain.User;
import com.soa.gr6.lms.domain.enums.UserRole;
import com.soa.gr6.lms.domain.enums.UserStatus;

public record AdminUserResponse(
        UUID id,
        String email,
        String fullName,
        UserRole role,
        UserStatus status,
        Instant createdAt,
        Instant updatedAt) {

    public static AdminUserResponse from(User user) {
        return new AdminUserResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.getStatus(),
                user.getCreatedAt(),
                user.getUpdatedAt());
    }
}
