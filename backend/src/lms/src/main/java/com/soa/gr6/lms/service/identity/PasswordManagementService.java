package com.soa.gr6.lms.service.identity;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;
import java.util.Locale;

import com.soa.gr6.lms.domain.PasswordResetToken;
import com.soa.gr6.lms.domain.User;
import com.soa.gr6.lms.exception.ApiException;
import com.soa.gr6.lms.exception.ErrorCode;
import com.soa.gr6.lms.repository.PasswordResetTokenRepository;
import com.soa.gr6.lms.repository.UserRepository;
import com.soa.gr6.lms.service.identity.RefreshSessionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PasswordManagementService {
    private static final Logger log = LoggerFactory.getLogger(PasswordManagementService.class);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final RefreshSessionService refreshSessionService;
    private final JavaMailSender mailSender;
    private final String fromAddress;
    private final String mainWebUrl;

    public PasswordManagementService(UserRepository userRepository,
                                     PasswordResetTokenRepository resetTokenRepository,
                                     PasswordEncoder passwordEncoder,
                                     RefreshSessionService refreshSessionService,
                                     JavaMailSender mailSender,
                                     @Value("${app.mail.from:no-reply@lms.local}") String fromAddress,
                                     @Value("${app.frontend.main-url:http://localhost:5173}") String mainWebUrl) {
        this.userRepository = userRepository;
        this.resetTokenRepository = resetTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.refreshSessionService = refreshSessionService;
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
        this.mainWebUrl = mainWebUrl.replaceAll("/$", "");
    }

    @Transactional
    public void requestReset(String email) {
        Instant now = Instant.now();
        userRepository.findByEmail(email.trim().toLowerCase(Locale.ROOT)).filter(User::hasPassword).filter(User::isActive)
                .filter(user -> user.canRequestPasswordReset(now))
                .ifPresent(user -> {
                    resetTokenRepository.deleteByUserId(user.getId());
                    String rawToken = newResetToken();
                    resetTokenRepository.save(new PasswordResetToken(UUID.randomUUID(), user, hash(rawToken),
                            now.plus(30, ChronoUnit.MINUTES)));
                    user.markPasswordResetRequested(now);
                    sendResetEmail(user.getEmail(), rawToken);
                });
    }

    @Transactional
    public void confirmReset(String rawToken, String newPassword) {
        PasswordResetToken token = resetTokenRepository.findByHashForUpdate(hash(rawToken))
                .orElseThrow(() -> new ApiException(ErrorCode.UNAUTHORIZED));
        Instant now = Instant.now();
        if (!token.isUsableAt(now) || !token.getUser().hasPassword() || !token.getUser().isActive()) {
            throw new ApiException(ErrorCode.UNAUTHORIZED);
        }
        token.consume(now);
        token.getUser().changePasswordHash(passwordEncoder.encode(newPassword));
        refreshSessionService.revokeAll(token.getUser().getId());
    }

    @Transactional
    public void changePassword(UUID userId, String currentPassword, String newPassword) {
        User user = userRepository.findById(userId).orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));
        if (!user.hasPassword()) {
            throw new ApiException(ErrorCode.GOOGLE_ACCOUNT_ONLY);
        }
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new ApiException(ErrorCode.PASSWORD_MISMATCH);
        }
        user.changePasswordHash(passwordEncoder.encode(newPassword));
        resetTokenRepository.deleteByUserId(userId);
        refreshSessionService.revokeAll(userId);
    }

    private void sendResetEmail(String email, String token) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(email);
        message.setSubject("Đặt lại mật khẩu LMS");
        message.setText("Mở liên kết sau trong 30 phút để đặt lại mật khẩu: " + mainWebUrl
                + "/reset-password?token=" + token);
        try {
            mailSender.send(message);
        } catch (MailException e) {
            // Keep the public response generic and avoid logging email addresses or reset tokens.
            log.error("Password reset email delivery failed");
        }
    }

    private static String newResetToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is unavailable", e);
        }
    }
}
