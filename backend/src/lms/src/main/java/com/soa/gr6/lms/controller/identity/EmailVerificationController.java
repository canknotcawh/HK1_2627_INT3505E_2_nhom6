package com.soa.gr6.lms.controller.identity;

import jakarta.validation.Valid;
import com.soa.gr6.lms.dto.EmailVerificationConfirmRequest;
import com.soa.gr6.lms.dto.EmailVerificationResendRequest;
import com.soa.gr6.lms.dto.MessageResponse;
import com.soa.gr6.lms.service.identity.EmailVerificationDeliveryException;
import com.soa.gr6.lms.service.identity.EmailVerificationService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/auth/email-verification")
public class EmailVerificationController {
    private static final String RESEND_MESSAGE =
            "If the account is eligible, verification instructions will be sent.";

    private final EmailVerificationService emailVerificationService;

    public EmailVerificationController(EmailVerificationService emailVerificationService) {
        this.emailVerificationService = emailVerificationService;
    }

    @PostMapping("/confirm")
    public MessageResponse confirm(@Valid @RequestBody EmailVerificationConfirmRequest request) {
        emailVerificationService.confirm(request.email(), request.code(), request.token());
        return new MessageResponse("Email verified. You can sign in now.");
    }

    @PostMapping("/resend")
    public MessageResponse resend(@Valid @RequestBody EmailVerificationResendRequest request) {
        try {
            emailVerificationService.resend(request.email());
        } catch (EmailVerificationDeliveryException ignored) {
            // Keep the public response identical and let a retry issue a fresh message.
        }
        return new MessageResponse(RESEND_MESSAGE);
    }
}
