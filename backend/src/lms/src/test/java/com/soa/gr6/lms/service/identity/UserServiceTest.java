package com.soa.gr6.lms.service.identity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.soa.gr6.lms.domain.User;
import com.soa.gr6.lms.domain.enums.UserRole;
import com.soa.gr6.lms.dto.UserResponse;
import com.soa.gr6.lms.exception.ApiException;
import com.soa.gr6.lms.exception.ErrorCode;
import com.soa.gr6.lms.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    private UserService userService;

    @Test
    void getCurrentUserReturnsProfile() {
        userService = new UserService(userRepository);
        UUID id = UUID.randomUUID();
        when(userRepository.findById(id)).thenReturn(Optional.of(new User("sub-1", "an@example.com", "Nguyen An")));

        UserResponse response = userService.getCurrentUser(id);

        assertEquals("an@example.com", response.email());
        assertEquals(UserRole.USER, response.role());
    }

    @Test
    void getCurrentUserFailsWhenUserDoesNotExist() {
        userService = new UserService(userRepository);
        UUID id = UUID.randomUUID();
        when(userRepository.findById(id)).thenReturn(Optional.empty());

        ApiException e = assertThrows(ApiException.class, () -> userService.getCurrentUser(id));

        assertEquals(ErrorCode.USER_NOT_FOUND, e.getErrorCode());
    }

    @Test
    void getByIdReturnsDomainUser() {
        userService = new UserService(userRepository);
        UUID id = UUID.randomUUID();
        User user = new User("sub-1", "an@example.com", "Nguyen An");
        when(userRepository.findById(id)).thenReturn(Optional.of(user));

        assertSame(user, userService.getById(id));
    }

    @Test
    void getByIdRejectsUnknownUserAsUnauthorized() {
        userService = new UserService(userRepository);
        UUID id = UUID.randomUUID();
        when(userRepository.findById(id)).thenReturn(Optional.empty());

        ApiException e = assertThrows(ApiException.class, () -> userService.getById(id));

        assertEquals(ErrorCode.UNAUTHORIZED, e.getErrorCode());
    }
}
