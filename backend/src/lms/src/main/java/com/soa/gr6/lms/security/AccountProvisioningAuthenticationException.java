package com.soa.gr6.lms.security;

import org.springframework.security.core.AuthenticationException;

public class AccountProvisioningAuthenticationException extends AuthenticationException {
    private final String code;

    public AccountProvisioningAuthenticationException(String code, String message, Throwable cause) {
        super(message, cause);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
