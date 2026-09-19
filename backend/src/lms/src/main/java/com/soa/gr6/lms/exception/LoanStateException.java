package com.soa.gr6.lms.exception;

public class LoanStateException extends DomainException {
    public LoanStateException(String code, String message) {
        super(code, message);
    }
}
