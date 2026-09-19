package com.soa.gr6.lms.exception;

public class UserSuspendedException extends DomainException {
    public UserSuspendedException() {
        super("USER_SUSPENDED", "suspended users cannot borrow books");
    }
}
