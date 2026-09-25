package com.soa.gr6.lms.dto;

import java.util.UUID;

import com.soa.gr6.lms.domain.User;
import com.soa.gr6.lms.domain.enums.UserRole;

public record UserResponse(UUID id, String fullName, String email, UserRole role) {

    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getFullName(), user.getEmail(), user.getRole());
    }
}