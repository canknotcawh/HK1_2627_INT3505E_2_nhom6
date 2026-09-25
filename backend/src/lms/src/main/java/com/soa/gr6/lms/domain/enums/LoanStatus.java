package com.soa.gr6.lms.domain.enums;

public enum LoanStatus {
    ACTIVE,
    RETURNED,
    OVERDUE,
    LOST;

    /** A loan is open while the copy is still out with the borrower. */
    public boolean isOpen() {
        return this == ACTIVE || this == OVERDUE;
    }
}
