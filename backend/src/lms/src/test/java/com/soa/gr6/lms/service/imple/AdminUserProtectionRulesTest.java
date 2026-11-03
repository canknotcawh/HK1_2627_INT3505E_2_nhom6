package com.soa.gr6.lms.service.imple;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.soa.gr6.lms.domain.User;
import com.soa.gr6.lms.domain.enums.UserRole;
import com.soa.gr6.lms.domain.enums.UserStatus;
import com.soa.gr6.lms.exception.InvalidDomainStateException;
import com.soa.gr6.lms.repository.UserRepository;
import com.soa.gr6.lms.service.identity.RefreshSessionService;

/** Account-protection rules: no self lock-out and the last active admin is always kept. */
class AdminUserProtectionRulesTest {
    private final UserRepository users = mock(UserRepository.class);
    private final RefreshSessionService sessions = mock(RefreshSessionService.class);
    private final AdminUserServiceImpl service = new AdminUserServiceImpl(users, sessions);

    private static User account(UserRole role, UserStatus status) {
        User user = new User("sub-" + UUID.randomUUID(), UUID.randomUUID() + "@example.com", "Test User");
        if (role == UserRole.ADMIN) {
            user.promoteToAdmin();
        }
        if (status == UserStatus.SUSPENDED) {
            user.suspend();
        }
        return user;
    }

    /** The repository holds {@code target} plus {@code otherAdmins}; the admin lock returns every admin among them. */
    private UUID store(User target, User... otherAdmins) {
        UUID targetId = UUID.randomUUID();
        when(users.findById(targetId)).thenReturn(Optional.of(target));
        List<User> admins = new java.util.ArrayList<>(List.of(otherAdmins));
        if (target.getRole() == UserRole.ADMIN) {
            admins.add(target);
        }
        when(users.lockAllByRole(UserRole.ADMIN)).thenReturn(admins);
        return targetId;
    }

    @Test
    void adminCannotSuspendThemselves() {
        UUID id = UUID.randomUUID();

        assertThatThrownBy(() -> service.suspendUser(id, id)).isInstanceOf(InvalidDomainStateException.class);
        verify(sessions, never()).revokeAll(any(UUID.class));
    }

    @Test
    void adminCannotDemoteThemselves() {
        UUID id = UUID.randomUUID();

        assertThatThrownBy(() -> service.demoteToUser(id, id)).isInstanceOf(InvalidDomainStateException.class);
    }

    @Test
    void lastActiveAdminCannotBeSuspended() {
        User onlyAdmin = account(UserRole.ADMIN, UserStatus.ACTIVE);
        UUID id = store(onlyAdmin);

        assertThatThrownBy(() -> service.suspendUser(UUID.randomUUID(), id))
                .isInstanceOf(InvalidDomainStateException.class);
        assertThat(onlyAdmin.isActive()).isTrue();
        verify(sessions, never()).revokeAll(any(UUID.class));
    }

    @Test
    void lastActiveAdminCannotBeDemoted() {
        User onlyAdmin = account(UserRole.ADMIN, UserStatus.ACTIVE);
        UUID id = store(onlyAdmin);

        assertThatThrownBy(() -> service.demoteToUser(UUID.randomUUID(), id))
                .isInstanceOf(InvalidDomainStateException.class);
        assertThat(onlyAdmin.getRole()).isEqualTo(UserRole.ADMIN);
    }

    @Test
    void suspendedAdminsDoNotCountAsActiveAdmins() {
        User target = account(UserRole.ADMIN, UserStatus.ACTIVE);
        User suspendedAdmin = account(UserRole.ADMIN, UserStatus.SUSPENDED);
        UUID id = store(target, suspendedAdmin);

        assertThatThrownBy(() -> service.suspendUser(UUID.randomUUID(), id))
                .isInstanceOf(InvalidDomainStateException.class);
        assertThat(target.isActive()).isTrue();
    }

    @Test
    void adminCanBeSuspendedWhenAnotherActiveAdminExists() {
        User target = account(UserRole.ADMIN, UserStatus.ACTIVE);
        User otherAdmin = account(UserRole.ADMIN, UserStatus.ACTIVE);
        UUID id = store(target, otherAdmin);

        service.suspendUser(UUID.randomUUID(), id);

        assertThat(target.getStatus()).isEqualTo(UserStatus.SUSPENDED);
        verify(sessions).revokeAll(id);
    }

    @Test
    void adminCanBeDemotedWhenAnotherActiveAdminExists() {
        User target = account(UserRole.ADMIN, UserStatus.ACTIVE);
        User otherAdmin = account(UserRole.ADMIN, UserStatus.ACTIVE);
        UUID id = store(target, otherAdmin);

        service.demoteToUser(UUID.randomUUID(), id);

        assertThat(target.getRole()).isEqualTo(UserRole.USER);
    }

    @Test
    void regularUserCanAlwaysBeSuspendedAndLosesSessions() {
        User onlyAdmin = account(UserRole.ADMIN, UserStatus.ACTIVE);
        User regular = account(UserRole.USER, UserStatus.ACTIVE);
        UUID id = UUID.randomUUID();
        when(users.findById(id)).thenReturn(Optional.of(regular));
        when(users.lockAllByRole(UserRole.ADMIN)).thenReturn(List.of(onlyAdmin));

        service.suspendUser(UUID.randomUUID(), id);

        assertThat(regular.getStatus()).isEqualTo(UserStatus.SUSPENDED);
        verify(sessions).revokeAll(id);
    }

    @Test
    void suspendedAccountCanBeReactivated() {
        User suspended = account(UserRole.USER, UserStatus.SUSPENDED);
        UUID id = store(suspended);

        service.reactivateUser(id);

        assertThat(suspended.isActive()).isTrue();
    }

    @Test
    void userCanBePromoted() {
        User regular = account(UserRole.USER, UserStatus.ACTIVE);
        UUID id = store(regular);

        service.promoteToAdmin(id);

        assertThat(regular.getRole()).isEqualTo(UserRole.ADMIN);
    }
}
