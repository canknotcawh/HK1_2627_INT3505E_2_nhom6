package com.soa.gr6.lms.repository;

import java.util.Optional;
import java.util.UUID;
import java.time.Instant;

import com.soa.gr6.lms.domain.PasswordResetToken;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from PasswordResetToken t join fetch t.user where t.tokenHash = :hash")
    Optional<PasswordResetToken> findByHashForUpdate(@Param("hash") String hash);

    void deleteByUserId(UUID userId);

    long deleteByExpiresAtBefore(Instant cutoff);
}
