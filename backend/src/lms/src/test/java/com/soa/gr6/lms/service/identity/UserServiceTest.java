package com.soa.gr6.lms.service.identity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

import com.soa.gr6.lms.domain.User;
import com.soa.gr6.lms.domain.enums.UserRole;
import com.soa.gr6.lms.domain.enums.UserStatus;
import com.soa.gr6.lms.dto.UserResponse;
import com.soa.gr6.lms.exception.ApiException;
import com.soa.gr6.lms.exception.ErrorCode;
import com.soa.gr6.lms.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    private static final String SUBJECT = "0c1f6a52-7e0b-4c53-9d0e-1f6f3f1a9a11";

    @Mock
    private UserRepository userRepository;
    @Mock
    private PlatformTransactionManager transactionManager;

    private UserService userService;

    @BeforeEach
    void setUp() {
        lenient().when(transactionManager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        userService = new UserService(userRepository, transactionManager);
    }

    @Test
    void provisionCreatesUserOnFirstLogin() {
        when(userRepository.findByKeycloakSubject(SUBJECT)).thenReturn(Optional.empty());
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User user = userService.provision(jwt("An@Example.com", "Nguyen An", null));

        assertEquals(SUBJECT, user.getKeycloakSubject());
        assertEquals("an@example.com", user.getEmail());
        assertEquals("Nguyen An", user.getFullName());
        assertEquals(UserRole.USER, user.getRole());
        assertEquals(UserStatus.ACTIVE, user.getStatus());
    }

    @Test
    void provisionReturnsExistingUserWithoutSaving() {
        User existing = new User(SUBJECT, "an@example.com", "Nguyen An");
        when(userRepository.findByKeycloakSubject(SUBJECT)).thenReturn(Optional.of(existing));

        User user = userService.provision(jwt("an@example.com", "Nguyen An", null));

        assertSame(existing, user);
        verify(userRepository, never()).saveAndFlush(any(User.class));
    }

    @Test
    void provisionUpdatesEmailAndNameWhenKeycloakChanged() {
        User existing = new User(SUBJECT, "old@example.com", "Old Name");
        when(userRepository.findByKeycloakSubject(SUBJECT)).thenReturn(Optional.of(existing));

        User user = userService.provision(jwt("New@Example.com", "New Name", null));

        assertEquals("new@example.com", user.getEmail());
        assertEquals("New Name", user.getFullName());
    }

    @Test
    void provisionFallsBackToPreferredUsernameWhenNameIsMissing() {
        when(userRepository.findByKeycloakSubject(SUBJECT)).thenReturn(Optional.empty());
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User user = userService.provision(jwt("an@example.com", null, "an.nguyen"));

        assertEquals("an.nguyen", user.getFullName());
    }

    @Test
    void provisionRejectsTokenWithoutEmail() {
        ApiException e = assertThrows(ApiException.class,
                () -> userService.provision(jwt(null, "Nguyen An", null)));

        assertEquals(ErrorCode.UNAUTHORIZED, e.getErrorCode());
        verify(userRepository, never()).findByKeycloakSubject(anyString());
    }

    @Test
    void provisionReadsAgainWhenAnotherRequestCreatedTheUserFirst() {
        User createdByOtherRequest = new User(SUBJECT, "an@example.com", "Nguyen An");
        when(userRepository.findByKeycloakSubject(SUBJECT))
                .thenReturn(Optional.empty(), Optional.of(createdByOtherRequest));
        when(userRepository.saveAndFlush(any(User.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate keycloak_subject"));

        User user = userService.provision(jwt("an@example.com", "Nguyen An", null));

        assertSame(createdByOtherRequest, user);
    }

    @Test
    void provisionRethrowsWhenTheConflictIsNotARace() {
        when(userRepository.findByKeycloakSubject(SUBJECT)).thenReturn(Optional.empty());
        when(userRepository.saveAndFlush(any(User.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate email"));

        assertThrows(DataIntegrityViolationException.class,
                () -> userService.provision(jwt("an@example.com", "Nguyen An", null)));
    }

    @Test
    void getCurrentUserReturnsProfile() {
        UUID id = UUID.randomUUID();
        when(userRepository.findById(id)).thenReturn(Optional.of(new User(SUBJECT, "an@example.com", "Nguyen An")));

        UserResponse response = userService.getCurrentUser(id);

        assertEquals("an@example.com", response.email());
        assertEquals(UserRole.USER, response.role());
    }

    @Test
    void getCurrentUserFailsWhenUserDoesNotExist() {
        UUID id = UUID.randomUUID();
        when(userRepository.findById(id)).thenReturn(Optional.empty());

        ApiException e = assertThrows(ApiException.class, () -> userService.getCurrentUser(id));

        assertEquals(ErrorCode.USER_NOT_FOUND, e.getErrorCode());
    }

    private Jwt jwt(String email, String name, String preferredUsername) {
        Jwt.Builder builder = Jwt.withTokenValue("test-token")
                .header("alg", "none")
                .subject(SUBJECT);
        if (email != null) {
            builder.claim("email", email);
        }
        if (name != null) {
            builder.claim("name", name);
        }
        if (preferredUsername != null) {
            builder.claim("preferred_username", preferredUsername);
        }
        return builder.build();
    }
}