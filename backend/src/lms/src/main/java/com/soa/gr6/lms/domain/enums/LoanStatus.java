package com.soa.gr6.lms.domain.enums;

public enum LoanStatus {
    ACTIVE,
    RETURNED,
    OVERDUE,
    LOST,
    PENDING_RETURN;

    /** A loan is open while the copy is still out with the borrower, including while a return is pending confirmation. */
    public boolean isOpen() {
        return this == ACTIVE || this == OVERDUE || this == PENDING_RETURN;
    }
}
