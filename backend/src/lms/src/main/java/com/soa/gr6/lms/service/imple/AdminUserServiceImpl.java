package com.soa.gr6.lms.service.imple;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.soa.gr6.lms.domain.User;
import com.soa.gr6.lms.domain.enums.UserRole;
import com.soa.gr6.lms.domain.enums.UserStatus;
import com.soa.gr6.lms.dto.AdminUserResponse;
import com.soa.gr6.lms.exception.ApiException;
import com.soa.gr6.lms.exception.ErrorCode;
import com.soa.gr6.lms.exception.InvalidDomainStateException;
import com.soa.gr6.lms.repository.UserRepository;
import com.soa.gr6.lms.service.AdminUserService;
import com.soa.gr6.lms.service.support.PageableSupport;

@Service
public class AdminUserServiceImpl implements AdminUserService {
    static final int MAX_PAGE_SIZE = 100;

    private final UserRepository userRepository;

    public AdminUserServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AdminUserResponse> searchUsers(
            String keyword, UserStatus status, UserRole role, Pageable pageable) {
        Pageable clamped = PageableSupport.clamp(pageable, MAX_PAGE_SIZE);
        return userRepository.findAll(filter(keyword, status, role), clamped).map(AdminUserResponse::from);
    }

    @Override
    @Transactional(readOnly = true)
    public AdminUserResponse getUser(UUID userId) {
        return AdminUserResponse.from(findUser(userId));
    }

    @Override
    @Transactional
    public AdminUserResponse suspendUser(UUID adminId, UUID userId) {
        requireNotSelf(adminId, userId, "CANNOT_SUSPEND_SELF", "admins cannot suspend their own account");
        List<User> admins = lockAdminAccounts();
        User user = findUser(userId);
        requireAnotherActiveAdmin(admins, user, "CANNOT_SUSPEND_LAST_ACTIVE_ADMIN",
                "the last active admin account cannot be suspended");
        user.suspend();
        return AdminUserResponse.from(user);
    }

    @Override
    @Transactional
    public AdminUserResponse reactivateUser(UUID userId) {
        lockAdminAccounts();
        User user = findUser(userId);
        user.reactivate();
        return AdminUserResponse.from(user);
    }

    @Override
    @Transactional
    public AdminUserResponse promoteToAdmin(UUID userId) {
        lockAdminAccounts();
        User user = findUser(userId);
        user.promoteToAdmin();
        return AdminUserResponse.from(user);
    }

    @Override
    @Transactional
    public AdminUserResponse demoteToUser(UUID adminId, UUID userId) {
        requireNotSelf(adminId, userId, "CANNOT_DEMOTE_SELF", "admins cannot demote their own account");
        List<User> admins = lockAdminAccounts();
        User user = findUser(userId);
        requireAnotherActiveAdmin(admins, user, "CANNOT_DEMOTE_LAST_ACTIVE_ADMIN",
                "the last active admin account cannot be demoted");
        user.demoteToUser();
        return AdminUserResponse.from(user);
    }

    private User findUser(UUID userId) {
        return userRepository.findById(userId).orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));
    }

    private List<User> lockAdminAccounts() {
        return userRepository.lockAllByRole(UserRole.ADMIN);
    }

    private static void requireAnotherActiveAdmin(
            List<User> admins, User target, String code, String message) {
        boolean targetIsActiveAdmin = target.getRole() == UserRole.ADMIN && target.isActive();
        long activeAdminCount = admins.stream().filter(User::isActive).count();
        if (targetIsActiveAdmin && activeAdminCount <= 1) {
            throw new InvalidDomainStateException(code, message);
        }
    }

    private static void requireNotSelf(UUID adminId, UUID userId, String code, String message) {
        if (adminId.equals(userId)) {
            throw new InvalidDomainStateException(code, message);
        }
    }

    private static Specification<User> filter(String keyword, UserStatus status, UserRole role) {
        return (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (role != null) {
                predicates.add(cb.equal(root.get("role"), role));
            }
            if (keyword != null && !keyword.isBlank()) {
                String pattern = "%" + keyword.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("email")), pattern),
                        cb.like(cb.lower(root.get("fullName")), pattern)));
            }
            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };
    }
}
