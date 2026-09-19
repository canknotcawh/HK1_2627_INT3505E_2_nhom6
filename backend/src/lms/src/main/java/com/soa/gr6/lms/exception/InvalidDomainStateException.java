package com.soa.gr6.lms.exception;

public class InvalidDomainStateException extends DomainException {
    public InvalidDomainStateException(String code, String message) {
        super(code, message);
    }
}
