package com.soa.gr6.lms.domain;

import java.time.Instant;
import java.util.UUID;

import com.soa.gr6.lms.domain.enums.UserRole;
import com.soa.gr6.lms.domain.enums.UserStatus;
import com.soa.gr6.lms.exception.InvalidDomainStateException;

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

@Entity
@Table(name = "app_user")
@Getter
@NoArgsConstructor
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    /** Retained only to identify accounts migrated from the former Keycloak-backed schema. */
    @Column(name = "keycloak_subject", length = 64, unique = true)
    private String keycloakSubject;

    @Column(name = "google_subject", length = 64, unique = true)
    private String googleSubject;

    @Column(name = "password_hash", length = 255)
    private String passwordHash;

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

    @Column(name = "bootstrap_admin_granted", nullable = false)
    private boolean bootstrapAdminGranted;

    @Column(name = "email_verified", nullable = false, columnDefinition = "boolean default false")
    private boolean emailVerified;

    @Column(name = "profile_name_managed", nullable = false, columnDefinition = "boolean default false")
    private boolean profileNameManaged = false;

    @Column(name = "password_reset_requested_at")
    private Instant passwordResetRequestedAt;

    public User(String googleSubject, String email, String fullName) {
        this(googleSubject, email, fullName, false);
    }

    public User(String googleSubject, String email, String fullName, boolean emailVerified) {
        this.googleSubject = requireValue(googleSubject, "googleSubject");
        this.email = requireValue(email, "email");
        this.fullName = requireValue(fullName, "fullName");
        this.emailVerified = emailVerified;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    /** Password-based signup; the account has no Google identity. */
    public static User withPassword(String email, String fullName, String passwordHash) {
        User user = new User();
        user.email = requireValue(email, "email");
        user.fullName = requireValue(fullName, "fullName");
        user.passwordHash = requireValue(passwordHash, "passwordHash");
        user.createdAt = Instant.now();
        user.updatedAt = user.createdAt;
        return user;
    }

    public boolean hasPassword() {
        return passwordHash != null;
    }

    public void markEmailVerified() {
        this.emailVerified = true;
    }

    public void setEmailVerified(boolean emailVerified) {
        this.emailVerified = emailVerified;
    }

    public boolean isUnlinkedLegacyKeycloakAccount() {
        return keycloakSubject != null && googleSubject == null && passwordHash == null;
    }

    public void linkGoogleIdentity(String googleSubject) {
        if (!isUnlinkedLegacyKeycloakAccount()) {
            throw new InvalidDomainStateException(
                    "INVALID_IDENTITY_LINK", "Only an unlinked legacy account can be linked to Google");
        }
        this.googleSubject = requireValue(googleSubject, "googleSubject");
    }

    public void updateProfile(String fullName) {
        this.fullName = requireValue(fullName, "fullName");
        this.profileNameManaged = true;
    }

    public void syncGoogleProfile(String fullName) {
        if (!profileNameManaged) {
            this.fullName = requireValue(fullName, "fullName");
        }
    }

    public void changePasswordHash(String passwordHash) {
        this.passwordHash = requireValue(passwordHash, "passwordHash");
    }

    public boolean canRequestPasswordReset(Instant now) {
        return passwordResetRequestedAt == null || passwordResetRequestedAt.isBefore(now.minusSeconds(60));
    }

    public void markPasswordResetRequested(Instant now) {
        passwordResetRequestedAt = now;
    }

    public void changeEmail(String email) {
        this.email = requireValue(email, "email");
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

    public void markBootstrapAdminGranted() {
        bootstrapAdminGranted = true;
    }

    public boolean isActive() {
        return status == UserStatus.ACTIVE;
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
