package com.soa.gr6.lms.repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import com.soa.gr6.lms.domain.EmailVerificationChallenge;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EmailVerificationChallengeRepository
        extends JpaRepository<EmailVerificationChallenge, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from EmailVerificationChallenge c join fetch c.user where c.user.id = :userId")
    Optional<EmailVerificationChallenge> findByUserIdForUpdate(@Param("userId") UUID userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from EmailVerificationChallenge c join fetch c.user where c.tokenHash = :tokenHash")
    Optional<EmailVerificationChallenge> findByTokenHashForUpdate(@Param("tokenHash") String tokenHash);

    @Query("select c.user.id from EmailVerificationChallenge c where c.tokenHash = :tokenHash")
    Optional<UUID> findUserIdByTokenHash(@Param("tokenHash") String tokenHash);

    @Modifying
    @Query("delete from EmailVerificationChallenge c where c.expiresAt < :cutoff")
    int deleteExpiredBefore(@Param("cutoff") Instant cutoff);
}
