package com.soa.gr6.lms.validation;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import com.soa.gr6.lms.validation.PasswordPolicy.Rule;

class PasswordPolicyTest {

    @Test
    void acceptsPasswordWithEveryRequiredKind() {
        assertThat(PasswordPolicy.isAcceptable("Abcdef1!")).isTrue();
        assertThat(PasswordPolicy.isAcceptable("Mật-khẩu-9")).isTrue();
    }

    @Test
    void rejectsShortPasswords() {
        assertThat(PasswordPolicy.violations("Ab1!xyz")).containsExactly(Rule.MIN_LENGTH);
    }

    @Test
    void reportsEachMissingKind() {
        assertThat(PasswordPolicy.violations("abcdefgh")).containsExactlyInAnyOrder(Rule.DIGIT, Rule.UPPERCASE, Rule.SPECIAL);
        assertThat(PasswordPolicy.violations("ABCDEFG1")).containsExactlyInAnyOrder(Rule.LOWERCASE, Rule.SPECIAL);
        assertThat(PasswordPolicy.violations("Abcdefgh")).containsExactlyInAnyOrder(Rule.DIGIT, Rule.SPECIAL);
        assertThat(PasswordPolicy.violations("Abcdefg1")).containsExactly(Rule.SPECIAL);
        assertThat(PasswordPolicy.violations("abcdefg1!")).containsExactly(Rule.UPPERCASE);
    }

    @Test
    void whitespaceIsNotASpecialCharacter() {
        assertThat(PasswordPolicy.violations("Abcdef1 ")).containsExactly(Rule.SPECIAL);
    }

    @Test
    void rejectsPasswordsBcryptWouldTruncate() {
        assertThat(PasswordPolicy.isAcceptable("Aa1!" + "x".repeat(68))).isTrue();      // exactly 72 bytes
        assertThat(PasswordPolicy.violations("Aa1!" + "x".repeat(69))).containsExactly(Rule.MAX_BYTES);
    }

    @Test
    void measuresTheByteLimitInUtf8() {
        assertThat(PasswordPolicy.violations("Aa1!" + "ế".repeat(30))).containsExactly(Rule.MAX_BYTES);
    }

    @Test
    void nullViolatesEverythingExceptTheUpperLimit() {
        assertThat(PasswordPolicy.violations(null)).doesNotContain(Rule.MAX_BYTES).hasSize(5);
    }
}
