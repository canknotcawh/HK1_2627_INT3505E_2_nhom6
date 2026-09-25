package com.soa.gr6.lms.service;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.soa.gr6.lms.domain.enums.UserRole;
import com.soa.gr6.lms.domain.enums.UserStatus;
import com.soa.gr6.lms.dto.AdminUserResponse;

public interface AdminUserService {
    /** Lists users; every filter is optional. {@code keyword} matches email or full name, case-insensitively. */
    Page<AdminUserResponse> searchUsers(String keyword, UserStatus status, UserRole role, Pageable pageable);

    AdminUserResponse getUser(UUID userId);

    AdminUserResponse suspendUser(UUID adminId, UUID userId);

    AdminUserResponse reactivateUser(UUID userId);

    AdminUserResponse promoteToAdmin(UUID userId);

    AdminUserResponse demoteToUser(UUID adminId, UUID userId);
}
