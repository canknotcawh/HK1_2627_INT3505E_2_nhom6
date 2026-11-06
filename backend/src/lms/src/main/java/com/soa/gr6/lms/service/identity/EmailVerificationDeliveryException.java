package com.soa.gr6.lms.service.identity;

public class EmailVerificationDeliveryException extends RuntimeException {
    public EmailVerificationDeliveryException(Throwable cause) {
        super("Email verification message could not be delivered", cause);
    }
}
