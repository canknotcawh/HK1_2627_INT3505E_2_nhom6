package com.soa.gr6.lms.service.identity;

import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.soa.gr6.lms.domain.User;
import com.soa.gr6.lms.dto.AccessTokenResponse;
import com.soa.gr6.lms.dto.AuthResponse;
import com.soa.gr6.lms.dto.UserResponse;
import com.soa.gr6.lms.exception.ApiException;
import com.soa.gr6.lms.exception.ErrorCode;
import com.soa.gr6.lms.repository.UserRepository;
import com.soa.gr6.lms.security.jwt.JwtService;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final TransactionTemplate transactionTemplate;
    private final JwtService jwtService;
    private final GoogleIdTokenVerifier googleIdTokenVerifier;
    private final List<String> bootstrapAdminEmails;

    public AuthService(UserRepository userRepository,
                       PlatformTransactionManager transactionManager,
                       JwtService jwtService,
                       GoogleIdTokenVerifier googleIdTokenVerifier,
                       @Value("${app.bootstrap-admin-emails:}") List<String> bootstrapAdminEmails) {
        this.userRepository = userRepository;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.jwtService = jwtService;
        this.googleIdTokenVerifier = googleIdTokenVerifier;
        this.bootstrapAdminEmails = bootstrapAdminEmails.stream()
                .map(e -> e.trim().toLowerCase(Locale.ROOT))
                .filter(e -> !e.isEmpty())
                .toList();
    }

    public AuthResponse loginWithGoogle(String googleIdToken) {
        GoogleIdToken.Payload payload = verify(googleIdToken);

        String subject = payload.getSubject();
        String email = payload.getEmail();
        if (isBlank(subject) || isBlank(email)) {
            throw new ApiException(ErrorCode.UNAUTHORIZED);
        }
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        String fullName = resolveFullName(payload, normalizedEmail);
        boolean grantAdmin = bootstrapAdminEmails.contains(normalizedEmail)
                && Boolean.TRUE.equals(payload.getEmailVerified());

        User user;
        try {
            user = transactionTemplate.execute(status -> findOrCreate(subject, normalizedEmail, fullName, grantAdmin));
        } catch (DataIntegrityViolationException e) {
            user = transactionTemplate.execute(status ->
                    userRepository.findByGoogleSubject(subject).orElseThrow(() -> e));
        }

        if (!user.isActive()) {
            throw new ApiException(ErrorCode.ACCOUNT_DISABLED);
        }

        return new AuthResponse(
                jwtService.generateAccessToken(user),
                jwtService.generateRefreshToken(user),
                UserResponse.from(user));
    }

    public AccessTokenResponse refresh(String refreshToken) {
        UUID userId = jwtService.requireRefreshToken(refreshToken);
        User user = userRepository.findById(userId).orElseThrow(() -> new ApiException(ErrorCode.UNAUTHORIZED));
        if (!user.isActive()) {
            throw new ApiException(ErrorCode.ACCOUNT_DISABLED);
        }
        return new AccessTokenResponse(jwtService.generateAccessToken(user));
    }

    private GoogleIdToken.Payload verify(String googleIdToken) {
        GoogleIdToken idToken;
        try {
            idToken = googleIdTokenVerifier.verify(googleIdToken);
        } catch (Exception e) {
            throw new ApiException(ErrorCode.UNAUTHORIZED);
        }
        if (idToken == null) {
            throw new ApiException(ErrorCode.UNAUTHORIZED);
        }
        return idToken.getPayload();
    }

    private User findOrCreate(String subject, String email, String fullName, boolean grantAdmin) {
        Optional<User> existing = userRepository.findByGoogleSubject(subject);
        if (existing.isPresent()) {
            User user = existing.get();
            if (!user.getEmail().equals(email)) {
                user.changeEmail(email);
            }
            if (!user.getFullName().equals(fullName)) {
                user.updateProfile(fullName);
            }
            return user;
        }
        User created = new User(subject, email, fullName);
        if (grantAdmin) {
            created.promoteToAdmin();
        }
        return userRepository.saveAndFlush(created);
    }

    private String resolveFullName(GoogleIdToken.Payload payload, String email) {
        Object name = payload.get("name");
        if (name instanceof String s && !s.isBlank()) {
            return s.trim();
        }
        return email;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
