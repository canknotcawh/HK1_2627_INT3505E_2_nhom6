package com.soa.gr6.lms.service.identity;

import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import com.soa.gr6.lms.domain.User;
import com.soa.gr6.lms.dto.UserResponse;
import com.soa.gr6.lms.exception.ApiException;
import com.soa.gr6.lms.exception.ErrorCode;
import com.soa.gr6.lms.repository.UserRepository;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final TransactionTemplate transactionTemplate;

    public UserService(UserRepository userRepository, PlatformTransactionManager transactionManager) {
        this.userRepository = userRepository;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    public User provision(Jwt jwt) {
        String subject = jwt.getSubject();
        String email = jwt.getClaimAsString("email");
        if (isBlank(subject) || isBlank(email)) {
            throw new ApiException(ErrorCode.UNAUTHORIZED);
        }
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        String fullName = resolveFullName(jwt, normalizedEmail);

        try {
            return transactionTemplate.execute(status -> findOrCreate(subject, normalizedEmail, fullName));
        } catch (DataIntegrityViolationException e) {

            return transactionTemplate.execute(status ->
                    userRepository.findByKeycloakSubject(subject).orElseThrow(() -> e));
        }
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(UUID userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));
        return UserResponse.from(user);
    }

    private User findOrCreate(String subject, String email, String fullName) {
        Optional<User> existing = userRepository.findByKeycloakSubject(subject);
        if (existing.isPresent()) {
            User user = existing.get();
            if(!user.getEmail().equals(email)) {
                user.changeEmail(email);
            }
            if(!user.getFullName().equals(fullName)) {
                user.updateProfile(fullName);
            }
            return user;
        }
        return userRepository.saveAndFlush(new User(subject, email, fullName));
    }

    private String resolveFullName(Jwt jwt, String email) {
        String name = jwt.getClaimAsString("name");
        if (isBlank(name)) {
            name = email;
        }
        return name.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
