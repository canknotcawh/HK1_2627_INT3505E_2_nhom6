package com.soa.gr6.lms.controller.identity;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

import com.soa.gr6.lms.dto.AccessTokenResponse;
import com.soa.gr6.lms.dto.AuthResponse;
import com.soa.gr6.lms.dto.GoogleLoginRequest;
import com.soa.gr6.lms.dto.LogoutRequest;
import com.soa.gr6.lms.dto.MessageResponse;
import com.soa.gr6.lms.dto.PasswordResetConfirmRequest;
import com.soa.gr6.lms.dto.PasswordResetRequest;
import com.soa.gr6.lms.dto.PasswordLoginRequest;
import com.soa.gr6.lms.dto.RefreshRequest;
import com.soa.gr6.lms.dto.RegisterRequest;
import com.soa.gr6.lms.service.identity.AuthService;
import com.soa.gr6.lms.service.identity.PasswordManagementService;

@RestController
@RequestMapping("/api/v1/public/auth")
public class AuthController {

    private final AuthService authService;
    private final PasswordManagementService passwordManagementService;

    public AuthController(AuthService authService, PasswordManagementService passwordManagementService) {
        this.authService = authService;
        this.passwordManagementService = passwordManagementService;
    }

    @PostMapping("/google")
    public AuthResponse loginWithGoogle(@Valid @RequestBody GoogleLoginRequest request) {
        return authService.loginWithGoogle(request.idToken());
    }

    @PostMapping("/refresh")
    public AccessTokenResponse refresh(@Valid @RequestBody RefreshRequest request) {
        return authService.refresh(request.refreshToken());
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@Valid @RequestBody LogoutRequest request) {
        authService.logout(request.refreshToken());
    }

    @PostMapping("/password-reset/request")
    public MessageResponse requestPasswordReset(@Valid @RequestBody PasswordResetRequest request) {
        passwordManagementService.requestReset(request.email());
        return new MessageResponse("If the account is eligible, password reset instructions will be sent.");
    }

    @PostMapping("/password-reset/confirm")
    public MessageResponse confirmPasswordReset(@Valid @RequestBody PasswordResetConfirmRequest request) {
        passwordManagementService.confirmReset(request.token(), request.newPassword());
        return new MessageResponse("Password has been reset. Please sign in again.");
    }

    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request.email(), request.password(), request.fullName());
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody PasswordLoginRequest request) {
        return authService.loginWithPassword(request.email(), request.password());
    }
}
