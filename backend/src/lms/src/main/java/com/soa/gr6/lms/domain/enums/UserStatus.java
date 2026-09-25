package com.soa.gr6.lms.domain.enums;

public enum UserStatus {
    ACTIVE,
    SUSPENDED;

    public boolean canBorrow() {
        return this == ACTIVE;
    }
}
