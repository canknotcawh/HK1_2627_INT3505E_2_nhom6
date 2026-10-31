package com.soa.gr6.lms.service.identity;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import com.soa.gr6.lms.repository.PasswordResetTokenRepository;
import com.soa.gr6.lms.repository.RefreshSessionRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class IdentityTokenCleanupService {
    private final RefreshSessionRepository refreshSessionRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;

    public IdentityTokenCleanupService(RefreshSessionRepository refreshSessionRepository,
                                       PasswordResetTokenRepository passwordResetTokenRepository) {
        this.refreshSessionRepository = refreshSessionRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
    }

    @Scheduled(cron = "0 15 3 * * *", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public void removeExpiredIdentityTokens() {
        Instant now = Instant.now();
        refreshSessionRepository.deleteExpiredBefore(now.minus(30, ChronoUnit.DAYS));
        passwordResetTokenRepository.deleteByExpiresAtBefore(now.minus(7, ChronoUnit.DAYS));
    }
}
