package com.soa.gr6.lms.exception;

import java.util.UUID;

public class LoanNotFoundException extends DomainException {
    public LoanNotFoundException(UUID loanId) {
        super("LOAN_NOT_FOUND", "Loan not found: " + loanId);
    }
}
