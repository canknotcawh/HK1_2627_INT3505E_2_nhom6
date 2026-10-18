package com.soa.gr6.lms.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;

import com.soa.gr6.lms.domain.User;
import com.soa.gr6.lms.domain.enums.UserRole;
import com.soa.gr6.lms.exception.ApiException;
import com.soa.gr6.lms.exception.ErrorCode;
import com.soa.gr6.lms.service.identity.UserService;

@ExtendWith(MockitoExtension.class)
class AppJwtAuthenticationConverterTest {

    @Mock
    private UserService userService;

    private AppJwtAuthenticationConverter converter;
    private final UUID userId = UUID.randomUUID();
    private final Jwt jwt = Jwt.withTokenValue("test-token").header("alg", "none").subject(userId.toString()).build();

    @BeforeEach
    void setUp() {
        converter = new AppJwtAuthenticationConverter(userService);
    }

    @Test
    void activeUserGetsAuthorityFromDatabaseRole() {
        when(userService.getById(userId)).thenReturn(new User("sub-1", "an@example.com", "Nguyen An"));

        UsernamePasswordAuthenticationToken token = converter.convert(jwt);

        AuthenticatedUser principal = (AuthenticatedUser) token.getPrincipal();
        assertTrue(token.isAuthenticated());
        assertEquals("an@example.com", principal.email());
        assertEquals(UserRole.USER, principal.role());
        assertEquals(List.of("ROLE_USER"), authorities(token));
    }

    @Test
    void adminGetsAdminAuthority() {
        User admin = new User("sub-1", "an@example.com", "Nguyen An");
        admin.promoteToAdmin();
        when(userService.getById(userId)).thenReturn(admin);

        assertEquals(List.of("ROLE_ADMIN"), authorities(converter.convert(jwt)));
    }

    @Test
    void suspendedUserIsRejected() {
        User suspended = new User("sub-1", "an@example.com", "Nguyen An");
        suspended.suspend();
        when(userService.getById(userId)).thenReturn(suspended);

        assertThrows(DisabledException.class, () -> converter.convert(jwt));
    }

    @Test
    void tokenReferencingUnknownUserIsRejectedAsInvalidToken() {
        when(userService.getById(userId)).thenThrow(new ApiException(ErrorCode.UNAUTHORIZED));

        assertThrows(InvalidBearerTokenException.class, () -> converter.convert(jwt));
    }

    @Test
    void tokenWithNonUuidSubjectIsRejectedAsInvalidToken() {
        Jwt badSubject = Jwt.withTokenValue("t").header("alg", "none").subject("not-a-uuid").build();

        assertThrows(InvalidBearerTokenException.class, () -> converter.convert(badSubject));
    }

    private List<String> authorities(UsernamePasswordAuthenticationToken token) {
        return token.getAuthorities().stream().map(GrantedAuthority::getAuthority).toList();
    }
}
