package com.soa.gr6.lms.service.imple;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
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
        Pageable clamped = pageable.getPageSize() > MAX_PAGE_SIZE
                ? PageRequest.of(pageable.getPageNumber(), MAX_PAGE_SIZE, pageable.getSort())
                : pageable;
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
        User user = findUser(userId);
        user.suspend();
        return AdminUserResponse.from(user);
    }

    @Override
    @Transactional
    public AdminUserResponse reactivateUser(UUID userId) {
        User user = findUser(userId);
        user.reactivate();
        return AdminUserResponse.from(user);
    }

    @Override
    @Transactional
    public AdminUserResponse promoteToAdmin(UUID userId) {
        User user = findUser(userId);
        user.promoteToAdmin();
        return AdminUserResponse.from(user);
    }

    @Override
    @Transactional
    public AdminUserResponse demoteToUser(UUID adminId, UUID userId) {
        requireNotSelf(adminId, userId, "CANNOT_DEMOTE_SELF", "admins cannot demote their own account");
        User user = findUser(userId);
        user.demoteToUser();
        return AdminUserResponse.from(user);
    }

    private User findUser(UUID userId) {
        return userRepository.findById(userId).orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));
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
