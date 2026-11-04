package com.soa.gr6.lms.service.identity;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;

import com.soa.gr6.lms.domain.EmailVerificationChallenge;
import com.soa.gr6.lms.domain.User;
import com.soa.gr6.lms.exception.ApiException;
import com.soa.gr6.lms.exception.ErrorCode;
import com.soa.gr6.lms.repository.EmailVerificationChallengeRepository;
import com.soa.gr6.lms.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EmailVerificationService {
    private static final Logger log = LoggerFactory.getLogger(EmailVerificationService.class);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final EmailVerificationChallengeRepository challengeRepository;
    private final JavaMailSender mailSender;
    private final String fromAddress;
    private final String mainWebUrl;
    private final Duration challengeTtl;
    private final Duration resendCooldown;
    private final int maxAttempts;

    public EmailVerificationService(UserRepository userRepository,
                                    EmailVerificationChallengeRepository challengeRepository,
                                    JavaMailSender mailSender,
                                    @Value("${app.mail.from:no-reply@lms.local}") String fromAddress,
                                    @Value("${app.frontend.main-url:http://localhost:5173}") String mainWebUrl,
                                    @Value("${app.email-verification.challenge-ttl:10m}") Duration challengeTtl,
                                    @Value("${app.email-verification.resend-cooldown:60s}") Duration resendCooldown,
                                    @Value("${app.email-verification.max-attempts:5}") int maxAttempts) {
        this.userRepository = userRepository;
        this.challengeRepository = challengeRepository;
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
        this.mainWebUrl = mainWebUrl.replaceAll("/$", "");
        this.challengeTtl = challengeTtl;
        this.resendCooldown = resendCooldown;
        this.maxAttempts = maxAttempts;
    }

    /** Creates or replaces the pending challenge for a password account. */
    @Transactional
    public void issueForUser(UUID userId) {
        User user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));
        if (!user.hasPassword() || user.isEmailVerified() || !user.isActive()) {
            return;
        }
        issueLocked(user, Instant.now());
    }

    /** Always lets the caller return a generic response; failures roll back challenge changes. */
    @Transactional
    public void resend(String email) {
        String normalizedEmail = normalizeEmail(email);
        User user = userRepository.findByEmailForUpdate(normalizedEmail).orElse(null);
        if (user == null || !user.hasPassword() || user.isEmailVerified() || !user.isActive()) {
            return;
        }

        Instant now = Instant.now();
        EmailVerificationChallenge existing = challengeRepository.findByUserIdForUpdate(user.getId()).orElse(null);
        if (existing != null && existing.getLastSentAt().plus(resendCooldown).isAfter(now)) {
            return;
        }
        issueLocked(user, now, existing);
    }

    /** Confirms using either the account-bound OTP or its matching one-time link token. */
    @Transactional(noRollbackFor = ApiException.class)
    public void confirm(String email, String code, String token) {
        EmailVerificationChallenge challenge;
        if (token != null && !token.isBlank()) {
            String tokenHash = hash(token.trim());
            UUID userId = challengeRepository.findUserIdByTokenHash(tokenHash)
                    .orElseThrow(EmailVerificationService::invalidVerification);
            userRepository.findByIdForUpdate(userId)
                    .orElseThrow(EmailVerificationService::invalidVerification);
            challenge = challengeRepository.findByTokenHashForUpdate(tokenHash)
                    .orElseThrow(EmailVerificationService::invalidVerification);
        } else {
            String normalizedEmail = normalizeEmail(email);
            User user = userRepository.findByEmailForUpdate(normalizedEmail)
                    .orElseThrow(EmailVerificationService::invalidVerification);
            if (!user.hasPassword() || user.isEmailVerified()) {
                throw invalidVerification();
            }
            challenge = challengeRepository.findByUserIdForUpdate(user.getId())
                    .orElseThrow(EmailVerificationService::invalidVerification);
        }

        Instant now = Instant.now();
        if (!challenge.isUsableAt(now)
                || !challenge.getUser().hasPassword()
                || challenge.getUser().isEmailVerified()
                || !challenge.getUser().isActive()
                || challenge.getFailedAttempts() >= maxAttempts) {
            throw invalidVerification();
        }

        if (token == null || token.isBlank()) {
            if (!MessageDigest.isEqual(hash(code).getBytes(StandardCharsets.US_ASCII),
                    challenge.getOtpHash().getBytes(StandardCharsets.US_ASCII))) {
                challenge.recordFailedAttempt(now);
                throw invalidVerification();
            }
        }

        challenge.consume(now);
        challenge.getUser().markEmailVerified();
    }

    private void issueLocked(User user, Instant now) {
        EmailVerificationChallenge existing = challengeRepository.findByUserIdForUpdate(user.getId()).orElse(null);
        issueLocked(user, now, existing);
    }

    private void issueLocked(User user, Instant now, EmailVerificationChallenge existing) {
        String code = newOtp();
        String token = newToken();
        String otpHash = hash(code);
        String tokenHash = hash(token);
        Instant expiresAt = now.plus(challengeTtl);

        if (existing == null) {
            challengeRepository.saveAndFlush(new EmailVerificationChallenge(
                    UUID.randomUUID(), user, otpHash, tokenHash, expiresAt, now));
        } else {
            existing.replaceChallenge(otpHash, tokenHash, expiresAt, now);
            challengeRepository.flush();
        }

        try {
            sendVerificationEmail(user.getEmail(), code, token);
        } catch (MailException e) {
            log.error("Email verification delivery failed");
            throw new EmailVerificationDeliveryException(e);
        }
    }

    private void sendVerificationEmail(String email, String code, String token) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(email);
        message.setSubject("Xác minh email LMS");
        message.setText("Mã xác minh của bạn là " + code + ". Mã có hiệu lực trong "
                + Math.max(1, challengeTtl.toMinutes()) + " phút.\n\n"
                + "Hoặc mở liên kết xác minh một lần sau: " + mainWebUrl
                + "/verify-email?token=" + token);
        mailSender.send(message);
    }

    private static String newOtp() {
        return String.format(Locale.ROOT, "%06d", RANDOM.nextInt(1_000_000));
    }

    private static String newToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String hash(String secret) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(secret.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is unavailable", e);
        }
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static ApiException invalidVerification() {
        return new ApiException(ErrorCode.EMAIL_VERIFICATION_INVALID);
    }
}
