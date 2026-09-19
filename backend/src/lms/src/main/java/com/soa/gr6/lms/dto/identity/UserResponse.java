package com.soa.gr6.lms.dto.identity;

import java.util.UUID;

import com.soa.gr6.lms.domain.enums.UserRole;
import com.soa.gr6.lms.domain.enums.UserStatus;

public class UserResponse {
    private final UUID id;
    private final String keycloakSubject;
    private final String email;
    private final String fullName;
    private final UserRole role;
    private final UserStatus status;

    public UserResponse(UUID id, String keycloakSubject, String email, String fullName, UserRole role, UserStatus status) {
        this.id = id;
        this.keycloakSubject = keycloakSubject;
        this.email = email;
        this.fullName = fullName;
        this.role = role;
        this.status = status;
    }

    // Getters
    public UUID getId() {
        return id;
    }

    public String getKeycloakSubject() {
        return keycloakSubject;
    }

    public String getEmail() {
        return email;
    }

    public String getFullName() {
        return fullName;
    }

    public UserRole getRole() {
        return role;
    }

    public UserStatus getStatus() {
        return status;
    }
}
