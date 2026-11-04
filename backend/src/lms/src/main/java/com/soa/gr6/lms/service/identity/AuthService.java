package com.soa.gr6.lms.service.identity;

import java.util.List;
import java.util.Locale;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
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
import com.soa.gr6.lms.exception.DuplicateResourceException;
import com.soa.gr6.lms.exception.ErrorCode;
import com.soa.gr6.lms.repository.UserRepository;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final TransactionTemplate transactionTemplate;
    private final GoogleIdTokenVerifier googleIdTokenVerifier;
    private final PasswordEncoder passwordEncoder;
    private final RefreshSessionService refreshSessionService;
    private final EmailVerificationService emailVerificationService;
    private final List<String> bootstrapAdminEmails;

    public AuthService(UserRepository userRepository,
                       PlatformTransactionManager transactionManager,
                       GoogleIdTokenVerifier googleIdTokenVerifier,
                       PasswordEncoder passwordEncoder,
                       RefreshSessionService refreshSessionService,
                       EmailVerificationService emailVerificationService,
                       @Value("${app.bootstrap-admin-emails:}") List<String> bootstrapAdminEmails) {
        this.userRepository = userRepository;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.googleIdTokenVerifier = googleIdTokenVerifier;
        this.passwordEncoder = passwordEncoder;
        this.refreshSessionService = refreshSessionService;
        this.emailVerificationService = emailVerificationService;
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
        boolean emailVerified = Boolean.TRUE.equals(payload.getEmailVerified());
        boolean grantAdmin = bootstrapAdminEmails.contains(normalizedEmail) && emailVerified;

        User user;
        try {
            user = transactionTemplate.execute(status ->
                    findOrCreate(subject, normalizedEmail, fullName, grantAdmin, emailVerified));
        } catch (DataIntegrityViolationException e) {
            user = transactionTemplate.execute(status ->
                    userRepository.findByGoogleSubject(subject).orElseThrow(() -> e));
        }

        if (!user.isActive()) {
            throw new ApiException(ErrorCode.ACCOUNT_DISABLED);
        }

        return authResponse(user);
    }

    public void register(String email, String password, String fullName) {
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new DuplicateResourceException("EMAIL_ALREADY_REGISTERED", "email is already registered");
        }
        // Not eligible for bootstrap-admin: this email is self-declared and unverified,
        // unlike Google's email_verified claim.
        User created = User.withPassword(normalizedEmail, fullName.trim(), passwordEncoder.encode(password));
        User user;
        try {
            user = userRepository.saveAndFlush(created);
        } catch (DataIntegrityViolationException e) {
            throw new DuplicateResourceException("EMAIL_ALREADY_REGISTERED", "email is already registered");
        }

        emailVerificationService.issueForUser(user.getId());
    }

    public AuthResponse loginWithPassword(String email, String password) {
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        User user = userRepository.findByEmail(normalizedEmail).orElseThrow(() -> new ApiException(ErrorCode.UNAUTHORIZED));
        if (!user.hasPassword()) {
            throw new ApiException(ErrorCode.GOOGLE_ACCOUNT_ONLY);
        }
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new ApiException(ErrorCode.UNAUTHORIZED);
        }
        if (!user.isActive()) {
            throw new ApiException(ErrorCode.ACCOUNT_DISABLED);
        }
        if (!user.isEmailVerified()) {
            throw new ApiException(ErrorCode.EMAIL_NOT_VERIFIED);
        }

        return authResponse(user);
    }

    public AccessTokenResponse refresh(String refreshToken) {
        RefreshSessionService.SessionTokens tokens = refreshSessionService.rotate(refreshToken)
                .orElseThrow(() -> new ApiException(ErrorCode.UNAUTHORIZED));
        return new AccessTokenResponse(tokens.accessToken(), tokens.refreshToken());
    }

    public void logout(String refreshToken) {
        refreshSessionService.revoke(refreshToken);
    }

    private AuthResponse authResponse(User user) {
        RefreshSessionService.SessionTokens tokens = refreshSessionService.create(user);
        return new AuthResponse(tokens.accessToken(), tokens.refreshToken(), UserResponse.from(user));
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

    private User findOrCreate(String subject, String email, String fullName, boolean grantAdmin,
                              boolean emailVerified) {
        Optional<User> existing = userRepository.findByGoogleSubject(subject);
        if (existing.isPresent()) {
            User user = existing.get();
            if (!user.getEmail().equals(email)) {
                user.changeEmail(email);
            }
            user.setEmailVerified(emailVerified);
            user.syncGoogleProfile(fullName);
            return user;
        }
        Optional<User> emailMatch = userRepository.findByEmail(email);
        if (emailMatch.isPresent()) {
            User emailMatchedUser = emailMatch.get();
            if (emailVerified && emailMatchedUser.isUnlinkedLegacyKeycloakAccount()) {
                emailMatchedUser.linkGoogleIdentity(subject);
                emailMatchedUser.markEmailVerified();
                emailMatchedUser.syncGoogleProfile(fullName);
                return emailMatchedUser;
            }
            if (emailMatchedUser.hasPassword()) {
                // Do not let an unverified password signup absorb the real owner's Google identity.
                throw new DuplicateResourceException(
                        "EMAIL_REGISTERED_WITH_PASSWORD",
                        "this email is already registered with a password; log in with email and password instead");
            }
            throw new DuplicateResourceException(
                    "EMAIL_ALREADY_REGISTERED", "email is already associated with another sign-in method");
        }
        User created = new User(subject, email, fullName, emailVerified);
        if (grantAdmin) {
            created.promoteToAdmin();
            created.markBootstrapAdminGranted();
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
