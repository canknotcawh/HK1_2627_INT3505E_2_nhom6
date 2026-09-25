package com.soa.gr6.lms.exception;

public class DuplicateResourceException extends DomainException {
    public DuplicateResourceException(String code, String message) {
        super(code, message);
    }
}
