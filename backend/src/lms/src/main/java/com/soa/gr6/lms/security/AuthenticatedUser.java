package com.soa.gr6.lms.security;

import java.util.UUID;

import com.soa.gr6.lms.domain.enums.UserRole;

public record AuthenticatedUser(UUID id, String email, UserRole role) {
}