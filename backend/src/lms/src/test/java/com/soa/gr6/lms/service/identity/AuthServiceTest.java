package com.soa.gr6.lms.service.identity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.soa.gr6.lms.domain.User;
import com.soa.gr6.lms.domain.enums.UserRole;
import com.soa.gr6.lms.dto.AuthResponse;
import com.soa.gr6.lms.exception.ApiException;
import com.soa.gr6.lms.exception.ErrorCode;
import com.soa.gr6.lms.repository.UserRepository;
import com.soa.gr6.lms.security.jwt.JwtService;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    private static final String SUBJECT = "0c1f6a52-7e0b-4c53-9d0e-1f6f3f1a9a11";

    @Mock
    private UserRepository userRepository;
    @Mock
    private PlatformTransactionManager transactionManager;
    @Mock
    private JwtService jwtService;
    @Mock
    private GoogleIdTokenVerifier googleIdTokenVerifier;
    @Mock
    private GoogleIdToken googleIdToken;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        lenient().when(transactionManager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        authService = new AuthService(userRepository, transactionManager, jwtService, googleIdTokenVerifier, List.of());
    }

    @Test
    void loginCreatesUserOnFirstLogin() throws Exception {
        mockGoogleToken("an@example.com", "Nguyen An", null);
        when(userRepository.findByGoogleSubject(SUBJECT)).thenReturn(Optional.empty());
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(jwtService.generateAccessToken(any())).thenReturn("access");
        when(jwtService.generateRefreshToken(any())).thenReturn("refresh");

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
        when(jwtService.generateAccessToken(existing)).thenReturn("access");
        when(jwtService.generateRefreshToken(existing)).thenReturn("refresh");

        authService.loginWithGoogle("google-id-token");

        verify(userRepository, never()).saveAndFlush(any(User.class));
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
        authService = new AuthService(userRepository, transactionManager, jwtService, googleIdTokenVerifier,
                List.of(" Admin@LMS.local "));
        mockGoogleToken("admin@lms.local", "Admin", true);
        when(userRepository.findByGoogleSubject(SUBJECT)).thenReturn(Optional.empty());
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(jwtService.generateAccessToken(any())).thenReturn("access");
        when(jwtService.generateRefreshToken(any())).thenReturn("refresh");

        AuthResponse response = authService.loginWithGoogle("google-id-token");

        assertEquals(UserRole.ADMIN, response.user().role());
    }

    @Test
    void bootstrapAdminIsIgnoredWhenEmailIsNotVerified() throws Exception {
        authService = new AuthService(userRepository, transactionManager, jwtService, googleIdTokenVerifier,
                List.of("admin@lms.local"));
        mockGoogleToken("admin@lms.local", "Admin", false);
        when(userRepository.findByGoogleSubject(SUBJECT)).thenReturn(Optional.empty());
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(jwtService.generateAccessToken(any())).thenReturn("access");
        when(jwtService.generateRefreshToken(any())).thenReturn("refresh");

        AuthResponse response = authService.loginWithGoogle("google-id-token");

        assertEquals(UserRole.USER, response.user().role());
    }

    @Test
    void loginReadsAgainWhenAnotherRequestCreatedTheUserFirst() throws Exception {
        mockGoogleToken("an@example.com", "Nguyen An", null);
        User createdByOtherRequest = new User(SUBJECT, "an@example.com", "Nguyen An");
        when(userRepository.findByGoogleSubject(SUBJECT))
                .thenReturn(Optional.empty(), Optional.of(createdByOtherRequest));
        when(userRepository.saveAndFlush(any(User.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate google_subject"));
        when(jwtService.generateAccessToken(createdByOtherRequest)).thenReturn("access");
        when(jwtService.generateRefreshToken(createdByOtherRequest)).thenReturn("refresh");

        AuthResponse response = authService.loginWithGoogle("google-id-token");

        assertEquals("an@example.com", response.user().email());
    }

    @Test
    void refreshIssuesNewAccessTokenForActiveUser() {
        UUID userId = UUID.randomUUID();
        User user = new User(SUBJECT, "an@example.com", "Nguyen An");
        when(jwtService.requireRefreshToken("refresh-token")).thenReturn(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(jwtService.generateAccessToken(user)).thenReturn("new-access");

        assertEquals("new-access", authService.refresh("refresh-token").accessToken());
    }

    @Test
    void refreshRejectsSuspendedUser() {
        UUID userId = UUID.randomUUID();
        User suspended = new User(SUBJECT, "an@example.com", "Nguyen An");
        suspended.suspend();
        when(jwtService.requireRefreshToken("refresh-token")).thenReturn(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(suspended));

        ApiException e = assertThrows(ApiException.class, () -> authService.refresh("refresh-token"));

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
