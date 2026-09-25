package com.soa.gr6.lms.service.imple;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.soa.gr6.lms.domain.User;
import com.soa.gr6.lms.domain.enums.UserRole;
import com.soa.gr6.lms.domain.enums.UserStatus;
import com.soa.gr6.lms.exception.ApiException;
import com.soa.gr6.lms.exception.ErrorCode;
import com.soa.gr6.lms.exception.InvalidDomainStateException;
import com.soa.gr6.lms.repository.UserRepository;

class AdminUserServiceImplTest {
    private final UserRepository userRepository = mock(UserRepository.class);
    private final AdminUserServiceImpl service = new AdminUserServiceImpl(userRepository);

    private final UUID adminId = UUID.randomUUID();
    private final UUID userId = UUID.randomUUID();
    private final User user = new User("sub-1", "a@b.com", "A B");

    @Test
    void suspendThenReactivate() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        assertThat(service.suspendUser(adminId, userId).status()).isEqualTo(UserStatus.SUSPENDED);
        assertThat(service.reactivateUser(userId).status()).isEqualTo(UserStatus.ACTIVE);
    }

    @Test
    void promoteThenDemote() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        assertThat(service.promoteToAdmin(userId).role()).isEqualTo(UserRole.ADMIN);
        assertThat(service.demoteToUser(adminId, userId).role()).isEqualTo(UserRole.USER);
    }

    @Test
    void adminCannotSuspendOrDemoteSelf() {
        assertThatThrownBy(() -> service.suspendUser(adminId, adminId))
                .isInstanceOf(InvalidDomainStateException.class)
                .hasMessageContaining("suspend");
        assertThatThrownBy(() -> service.demoteToUser(adminId, adminId))
                .isInstanceOf(InvalidDomainStateException.class)
                .hasMessageContaining("demote");
    }

    @Test
    void unknownUserIsNotFound() {
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getUser(userId))
                .isInstanceOfSatisfying(ApiException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.USER_NOT_FOUND));
    }
}
