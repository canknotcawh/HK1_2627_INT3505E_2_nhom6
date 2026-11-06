package com.soa.gr6.lms.domain.enums;

public enum ReviewStatus {
    VISIBLE,
    HIDDEN_BY_ADMIN,
    DELETED;

    public boolean isVisible() {
        return this == VISIBLE;
    }
}

