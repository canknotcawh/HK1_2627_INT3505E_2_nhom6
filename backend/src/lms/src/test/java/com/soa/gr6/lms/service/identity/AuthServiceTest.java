package com.soa.gr6.lms.service.identity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.soa.gr6.lms.domain.User;
import com.soa.gr6.lms.domain.enums.UserRole;
import com.soa.gr6.lms.dto.AuthResponse;
import com.soa.gr6.lms.exception.ApiException;
import com.soa.gr6.lms.exception.DuplicateResourceException;
import com.soa.gr6.lms.exception.ErrorCode;
import com.soa.gr6.lms.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    private static final String SUBJECT = "0c1f6a52-7e0b-4c53-9d0e-1f6f3f1a9a11";

    @Mock
    private UserRepository userRepository;
    @Mock
    private PlatformTransactionManager transactionManager;
    @Mock
    private RefreshSessionService refreshSessionService;
    @Mock
    private EmailVerificationService emailVerificationService;
    @Mock
    private GoogleIdTokenVerifier googleIdTokenVerifier;
    @Mock
    private GoogleIdToken googleIdToken;
    @Mock
    private PasswordEncoder passwordEncoder;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        lenient().when(transactionManager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        lenient().when(refreshSessionService.create(any(User.class)))
                .thenReturn(new RefreshSessionService.SessionTokens("access", "refresh"));
        authService = new AuthService(
                userRepository, transactionManager, googleIdTokenVerifier, passwordEncoder,
                refreshSessionService, emailVerificationService, List.of());
    }

    @Test
    void loginCreatesUserOnFirstLogin() throws Exception {
        mockGoogleToken("an@example.com", "Nguyen An", null);
        when(userRepository.findByGoogleSubject(SUBJECT)).thenReturn(Optional.empty());
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AuthResponse response = authService.loginWithGoogle("google-id-token");

        assertEquals("access", response.accessToken());
        assertEquals("refresh", response.refreshToken());
        assertEquals("an@example.com", response.user().email());
        assertEquals(UserRole.USER, response.user().role());
    }

    @Test
    void loginReturnsExistingUserWithoutSaving() throws Exception {
        mockGoogleToken("an@example.com", "Nguyen An", null);
        User existing = new User(SUBJECT, "an@example.com", "Nguyen An");
        when(userRepository.findByGoogleSubject(SUBJECT)).thenReturn(Optional.of(existing));

        authService.loginWithGoogle("google-id-token");

        verify(userRepository, never()).saveAndFlush(any(User.class));
    }

    @Test
    void googleLoginKeepsUserManagedProfileName() throws Exception {
        mockGoogleToken("an@example.com", "Google Name", true);
        User existing = new User(SUBJECT, "an@example.com", "Google Name");
        existing.updateProfile("Chosen Name");
        when(userRepository.findByGoogleSubject(SUBJECT)).thenReturn(Optional.of(existing));

        AuthResponse response = authService.loginWithGoogle("google-id-token");

        assertEquals("Chosen Name", response.user().fullName());
        assertEquals("an@example.com", response.user().email());
    }

    @Test
    void loginRejectsTokenWithoutEmail() throws Exception {
        mockGoogleToken(null, "Nguyen An", null);

        ApiException e = assertThrows(ApiException.class, () -> authService.loginWithGoogle("google-id-token"));

        assertEquals(ErrorCode.UNAUTHORIZED, e.getErrorCode());
    }

    @Test
    void loginRejectsInvalidGoogleToken() throws Exception {
        when(googleIdTokenVerifier.verify("bad-token")).thenReturn(null);

        ApiException e = assertThrows(ApiException.class, () -> authService.loginWithGoogle("bad-token"));

        assertEquals(ErrorCode.UNAUTHORIZED, e.getErrorCode());
    }

    @Test
    void loginRejectsSuspendedUser() throws Exception {
        mockGoogleToken("an@example.com", "Nguyen An", null);
        User suspended = new User(SUBJECT, "an@example.com", "Nguyen An");
        suspended.suspend();
        when(userRepository.findByGoogleSubject(SUBJECT)).thenReturn(Optional.of(suspended));

        ApiException e = assertThrows(ApiException.class, () -> authService.loginWithGoogle("google-id-token"));

        assertEquals(ErrorCode.ACCOUNT_DISABLED, e.getErrorCode());
    }

    @Test
    void bootstrapAdminEmailBecomesAdminWhenEmailIsVerified() throws Exception {
        authService = new AuthService(userRepository, transactionManager, googleIdTokenVerifier,
                passwordEncoder, refreshSessionService, emailVerificationService, List.of(" Admin@LMS.local "));
        mockGoogleToken("admin@lms.local", "Admin", true);
        when(userRepository.findByGoogleSubject(SUBJECT)).thenReturn(Optional.empty());
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AuthResponse response = authService.loginWithGoogle("google-id-token");

        assertEquals(UserRole.ADMIN, response.user().role());
        org.mockito.ArgumentCaptor<User> saved = org.mockito.ArgumentCaptor.forClass(User.class);
        verify(userRepository).saveAndFlush(saved.capture());
        assertTrue(saved.getValue().isEmailVerified());
    }

    @Test
    void bootstrapAdminIsIgnoredWhenEmailIsNotVerified() throws Exception {
        authService = new AuthService(userRepository, transactionManager, googleIdTokenVerifier,
                passwordEncoder, refreshSessionService, emailVerificationService, List.of("admin@lms.local"));
        mockGoogleToken("admin@lms.local", "Admin", false);
        when(userRepository.findByGoogleSubject(SUBJECT)).thenReturn(Optional.empty());
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AuthResponse response = authService.loginWithGoogle("google-id-token");

        assertEquals(UserRole.USER, response.user().role());
        org.mockito.ArgumentCaptor<User> saved = org.mockito.ArgumentCaptor.forClass(User.class);
        verify(userRepository).saveAndFlush(saved.capture());
        assertFalse(saved.getValue().isEmailVerified());
    }

    @Test
    void loginReadsAgainWhenAnotherRequestCreatedTheUserFirst() throws Exception {
        mockGoogleToken("an@example.com", "Nguyen An", null);
        User createdByOtherRequest = new User(SUBJECT, "an@example.com", "Nguyen An");
        when(userRepository.findByGoogleSubject(SUBJECT))
                .thenReturn(Optional.empty(), Optional.of(createdByOtherRequest));
        when(userRepository.saveAndFlush(any(User.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate google_subject"));

        AuthResponse response = authService.loginWithGoogle("google-id-token");

        assertEquals("an@example.com", response.user().email());
    }

    @Test
    void refreshIssuesNewAccessTokenForActiveUser() {
        when(refreshSessionService.rotate("refresh-token"))
                .thenReturn(Optional.of(new RefreshSessionService.SessionTokens("new-access", "new-refresh")));

        assertEquals("new-access", authService.refresh("refresh-token").accessToken());
        assertEquals("new-refresh", authService.refresh("refresh-token").refreshToken());
    }

    @Test
    void refreshRejectsSuspendedUser() {
        when(refreshSessionService.rotate("refresh-token")).thenReturn(Optional.empty());

        ApiException e = assertThrows(ApiException.class, () -> authService.refresh("refresh-token"));

        assertEquals(ErrorCode.UNAUTHORIZED, e.getErrorCode());
    }

    @Test
    void loginWithGoogleRejectsEmailAlreadyRegisteredWithPassword() throws Exception {
        mockGoogleToken("an@example.com", "Nguyen An", null);
        when(userRepository.findByGoogleSubject(SUBJECT)).thenReturn(Optional.empty());
        when(userRepository.findByEmail("an@example.com"))
                .thenReturn(Optional.of(User.withPassword("an@example.com", "An", "hash")));

        DuplicateResourceException e = assertThrows(DuplicateResourceException.class,
                () -> authService.loginWithGoogle("google-id-token"));

        assertEquals("EMAIL_REGISTERED_WITH_PASSWORD", e.getCode());
    }

    @Test
    void loginWithGoogleLinksVerifiedEmailToLegacyKeycloakAccount() throws Exception {
        mockGoogleToken("legacy@example.com", "Legacy Reader", true);
        User legacy = new User();
        ReflectionTestUtils.setField(legacy, "keycloakSubject", "legacy-keycloak-subject");
        ReflectionTestUtils.setField(legacy, "email", "legacy@example.com");
        ReflectionTestUtils.setField(legacy, "fullName", "Old Name");
        ReflectionTestUtils.setField(legacy, "createdAt", java.time.Instant.now());
        ReflectionTestUtils.setField(legacy, "updatedAt", java.time.Instant.now());
        when(userRepository.findByGoogleSubject(SUBJECT)).thenReturn(Optional.empty());
        when(userRepository.findByEmail("legacy@example.com")).thenReturn(Optional.of(legacy));

        AuthResponse response = authService.loginWithGoogle("google-id-token");

        assertEquals(UserRole.USER, response.user().role());
        assertEquals("legacy@example.com", response.user().email());
        assertEquals(SUBJECT, legacy.getGoogleSubject());
        verify(userRepository, never()).saveAndFlush(any(User.class));
    }

    @Test
    void loginWithGoogleDoesNotLinkUnverifiedEmailToLegacyKeycloakAccount() throws Exception {
        mockGoogleToken("legacy@example.com", "Legacy Reader", false);
        User legacy = new User();
        ReflectionTestUtils.setField(legacy, "keycloakSubject", "legacy-keycloak-subject");
        ReflectionTestUtils.setField(legacy, "email", "legacy@example.com");
        ReflectionTestUtils.setField(legacy, "fullName", "Old Name");
        when(userRepository.findByGoogleSubject(SUBJECT)).thenReturn(Optional.empty());
        when(userRepository.findByEmail("legacy@example.com")).thenReturn(Optional.of(legacy));

        DuplicateResourceException e = assertThrows(DuplicateResourceException.class,
                () -> authService.loginWithGoogle("google-id-token"));

        assertEquals("EMAIL_ALREADY_REGISTERED", e.getCode());
        org.junit.jupiter.api.Assertions.assertNull(legacy.getGoogleSubject());
    }

    @Test
    void registerCreatesUnverifiedUserAndSendsVerificationWithoutCreatingSession() {
        when(userRepository.existsByEmail("an@example.com")).thenReturn(false);
        when(passwordEncoder.encode("secret123")).thenReturn("hashed");
        User savedUser = User.withPassword("an@example.com", "Nguyen An", "hashed");
        java.util.UUID userId = java.util.UUID.randomUUID();
        ReflectionTestUtils.setField(savedUser, "id", userId);
        when(userRepository.saveAndFlush(any(User.class))).thenReturn(savedUser);

        authService.register("An@Example.com", "secret123", "Nguyen An");

        assertFalse(savedUser.isEmailVerified());
        verify(emailVerificationService).issueForUser(userId);
        verify(refreshSessionService, never()).create(any(User.class));
    }

    @Test
    void registerRejectsDuplicateEmail() {
        when(userRepository.existsByEmail("an@example.com")).thenReturn(true);

        DuplicateResourceException e = assertThrows(DuplicateResourceException.class,
                () -> authService.register("an@example.com", "secret123", "Nguyen An"));

        assertEquals("EMAIL_ALREADY_REGISTERED", e.getCode());
    }

    @Test
    void loginWithPasswordSucceedsForMatchingCredentials() {
        User user = User.withPassword("an@example.com", "Nguyen An", "hashed");
        user.markEmailVerified();
        when(userRepository.findByEmail("an@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("secret123", "hashed")).thenReturn(true);

        AuthResponse response = authService.loginWithPassword("an@example.com", "secret123");

        assertEquals("access", response.accessToken());
    }

    @Test
    void loginWithPasswordRejectsUnverifiedAccountWithoutCreatingSession() {
        User user = User.withPassword("an@example.com", "Nguyen An", "hashed");
        when(userRepository.findByEmail("an@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("secret123", "hashed")).thenReturn(true);

        ApiException e = assertThrows(ApiException.class,
                () -> authService.loginWithPassword("an@example.com", "secret123"));

        assertEquals(ErrorCode.EMAIL_NOT_VERIFIED, e.getErrorCode());
        verify(refreshSessionService, never()).create(any(User.class));
    }

    @Test
    void loginWithPasswordRejectsWrongPassword() {
        User user = User.withPassword("an@example.com", "Nguyen An", "hashed");
        when(userRepository.findByEmail("an@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", "hashed")).thenReturn(false);

        ApiException e = assertThrows(ApiException.class,
                () -> authService.loginWithPassword("an@example.com", "wrong"));

        assertEquals(ErrorCode.UNAUTHORIZED, e.getErrorCode());
    }

    @Test
    void loginWithPasswordRejectsUnknownEmail() {
        when(userRepository.findByEmail("nope@example.com")).thenReturn(Optional.empty());

        ApiException e = assertThrows(ApiException.class,
                () -> authService.loginWithPassword("nope@example.com", "secret123"));

        assertEquals(ErrorCode.UNAUTHORIZED, e.getErrorCode());
    }

    @Test
    void loginWithPasswordRejectsGoogleOnlyAccount() throws Exception {
        User googleUser = new User(SUBJECT, "an@example.com", "Nguyen An");
        when(userRepository.findByEmail("an@example.com")).thenReturn(Optional.of(googleUser));

        ApiException e = assertThrows(ApiException.class,
                () -> authService.loginWithPassword("an@example.com", "secret123"));

        assertEquals(ErrorCode.GOOGLE_ACCOUNT_ONLY, e.getErrorCode());
    }

    @Test
    void loginWithPasswordRejectsSuspendedUser() {
        User user = User.withPassword("an@example.com", "Nguyen An", "hashed");
        user.suspend();
        when(userRepository.findByEmail("an@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("secret123", "hashed")).thenReturn(true);

        ApiException e = assertThrows(ApiException.class,
                () -> authService.loginWithPassword("an@example.com", "secret123"));

        assertEquals(ErrorCode.ACCOUNT_DISABLED, e.getErrorCode());
    }

    private void mockGoogleToken(String email, String name, Boolean emailVerified) throws Exception {
        when(googleIdTokenVerifier.verify("google-id-token")).thenReturn(googleIdToken);
        GoogleIdToken.Payload payload = new GoogleIdToken.Payload();
        payload.setSubject(SUBJECT);
        if (email != null) {
            payload.setEmail(email);
        }
        if (emailVerified != null) {
            payload.setEmailVerified(emailVerified);
        }
        if (name != null) {
            payload.set("name", name);
        }
        when(googleIdToken.getPayload()).thenReturn(payload);
    }
}
