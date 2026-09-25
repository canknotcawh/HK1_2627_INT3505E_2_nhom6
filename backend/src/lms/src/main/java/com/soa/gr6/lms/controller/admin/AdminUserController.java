package com.soa.gr6.lms.controller.admin;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.soa.gr6.lms.domain.enums.UserRole;
import com.soa.gr6.lms.domain.enums.UserStatus;
import com.soa.gr6.lms.dto.AdminUserResponse;
import com.soa.gr6.lms.security.AuthenticatedUser;
import com.soa.gr6.lms.service.AdminUserService;

@RestController
@RequestMapping("/api/v1/admin/users")
public class AdminUserController {
    private final AdminUserService adminUserService;

    public AdminUserController(AdminUserService adminUserService) {
        this.adminUserService = adminUserService;
    }

    @GetMapping
    public Page<AdminUserResponse> searchUsers(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) UserStatus status,
            @RequestParam(required = false) UserRole role,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        return adminUserService.searchUsers(q, status, role, pageable);
    }

    @GetMapping("/{userId}")
    public AdminUserResponse getUser(@PathVariable UUID userId) {
        return adminUserService.getUser(userId);
    }

    @PostMapping("/{userId}/suspend")
    public AdminUserResponse suspend(@AuthenticationPrincipal AuthenticatedUser admin, @PathVariable UUID userId) {
        return adminUserService.suspendUser(admin.id(), userId);
    }

    @PostMapping("/{userId}/reactivate")
    public AdminUserResponse reactivate(@PathVariable UUID userId) {
        return adminUserService.reactivateUser(userId);
    }

    @PostMapping("/{userId}/promote")
    public AdminUserResponse promote(@PathVariable UUID userId) {
        return adminUserService.promoteToAdmin(userId);
    }

    @PostMapping("/{userId}/demote")
    public AdminUserResponse demote(@AuthenticationPrincipal AuthenticatedUser admin, @PathVariable UUID userId) {
        return adminUserService.demoteToUser(admin.id(), userId);
    }
}
