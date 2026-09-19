package com.soa.gr6.lms.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import com.soa.gr6.lms.domain.enums.UserRole;
import com.soa.gr6.lms.domain.enums.UserStatus;
import com.soa.gr6.lms.exception.InvalidDomainStateException;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "app_user")
@Getter
@NoArgsConstructor
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "keycloak_subject", length = 64, nullable = false, unique = true)
    private String keycloakSubject;

    @Column(name = "email", length = 255, nullable = false, unique = true)
    private String email;

    @Column(name = "full_name", length = 255, nullable = false)
    private String fullName;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", length = 20, nullable = false)
    private UserRole role = UserRole.USER;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private UserStatus status = UserStatus.ACTIVE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public User(String keycloakSubject, String email, String fullName) {
        this.keycloakSubject = requireValue(keycloakSubject, "keycloakSubject");
        this.email = requireValue(email, "email");
        this.fullName = requireValue(fullName, "fullName");
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    public void updateProfile(String fullName) {
        this.fullName = requireValue(fullName, "fullName");
    }

    public void suspend() {
        status = UserStatus.SUSPENDED;
    }

    public void reactivate() {
        status = UserStatus.ACTIVE;
    }

    public void promoteToAdmin() {
        role = UserRole.ADMIN;
    }

    public void demoteToUser() {
        role = UserRole.USER;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    private static String requireValue(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new InvalidDomainStateException(
                    "USER_" + fieldName.toUpperCase() + "_REQUIRED", fieldName + " must not be blank");
        }
        return value;
    }

}
