package com.soa.gr6.lms.validation;

import java.nio.charset.StandardCharsets;
import java.util.EnumSet;
import java.util.Set;

/**
 * Password strength rules for passwords being set (registration, reset, change).
 * Never apply this to login: existing accounts may hold passwords created before the policy.
 */
public final class PasswordPolicy {
    public static final int MIN_LENGTH = 8;
    /** BCrypt only uses the first 72 bytes, so longer passwords would be silently truncated. */
    public static final int MAX_BYTES = 72;

    public enum Rule { MIN_LENGTH, MAX_BYTES, DIGIT, LOWERCASE, UPPERCASE, SPECIAL }

    private PasswordPolicy() {
    }

    /** Returns the rules the password breaks; empty means it is acceptable. A special character is anything that is not a letter, digit or whitespace. */
    public static Set<Rule> violations(String password) {
        Set<Rule> broken = EnumSet.noneOf(Rule.class);
        if (password == null) {
            broken.addAll(EnumSet.allOf(Rule.class));
            broken.remove(Rule.MAX_BYTES);
            return broken;
        }
        if (password.codePointCount(0, password.length()) < MIN_LENGTH) {
            broken.add(Rule.MIN_LENGTH);
        }
        if (password.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) {
            broken.add(Rule.MAX_BYTES);
        }
        boolean digit = false;
        boolean lower = false;
        boolean upper = false;
        boolean special = false;
        for (int i = 0; i < password.length(); ) {
            int cp = password.codePointAt(i);
            i += Character.charCount(cp);
            if (Character.isDigit(cp)) {
                digit = true;
            } else if (Character.isLowerCase(cp)) {
                lower = true;
            } else if (Character.isUpperCase(cp)) {
                upper = true;
            } else if (!Character.isLetterOrDigit(cp) && !Character.isWhitespace(cp)) {
                special = true;
            }
        }
        if (!digit) broken.add(Rule.DIGIT);
        if (!lower) broken.add(Rule.LOWERCASE);
        if (!upper) broken.add(Rule.UPPERCASE);
        if (!special) broken.add(Rule.SPECIAL);
        return broken;
    }

    public static boolean isAcceptable(String password) {
        return violations(password).isEmpty();
    }
}
