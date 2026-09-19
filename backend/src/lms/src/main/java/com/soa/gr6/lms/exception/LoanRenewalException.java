package com.soa.gr6.lms.exception;

public class LoanRenewalException extends LoanStateException {
    public LoanRenewalException(String code, String message) {
        super(code, message);
    }
}
