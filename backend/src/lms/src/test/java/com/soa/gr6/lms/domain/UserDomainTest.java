package com.soa.gr6.lms.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

import com.soa.gr6.lms.domain.enums.UserRole;
import com.soa.gr6.lms.domain.enums.UserStatus;
import com.soa.gr6.lms.exception.InvalidDomainStateException;

class UserDomainTest {

    @Test
    void newUserIsActiveUser() {
        User user = new User("sub", "a@b.com", "A B");
        assertThat(user.isActive()).isTrue();
        assertThat(user.getRole()).isEqualTo(UserRole.USER);
        assertThat(user.getCreatedAt()).isNotNull();
    }

    @Test
    void lifecycleTransitions() {
        User user = new User("sub", "a@b.com", "A B");
        user.suspend();
        assertThat(user.getStatus()).isEqualTo(UserStatus.SUSPENDED);
        assertThat(user.isActive()).isFalse();
        assertThat(user.getStatus().canBorrow()).isFalse();
        user.reactivate();
        assertThat(user.isActive()).isTrue();
        user.promoteToAdmin();
        assertThat(user.getRole()).isEqualTo(UserRole.ADMIN);
        user.demoteToUser();
        assertThat(user.getRole()).isEqualTo(UserRole.USER);
    }

    @Test
    void profileAndEmailUpdates() {
        User user = new User("sub", "a@b.com", "A B");
        user.updateProfile("New Name");
        user.changeEmail("n@b.com");
        assertThat(user.getFullName()).isEqualTo("New Name");
        assertThat(user.getEmail()).isEqualTo("n@b.com");
        assertThatThrownBy(() -> user.updateProfile(" ")).isInstanceOf(InvalidDomainStateException.class);
        assertThatThrownBy(() -> user.changeEmail(null)).isInstanceOf(InvalidDomainStateException.class);
        assertThatThrownBy(() -> new User(null, "a@b.com", "n")).isInstanceOf(InvalidDomainStateException.class);
    }
}
