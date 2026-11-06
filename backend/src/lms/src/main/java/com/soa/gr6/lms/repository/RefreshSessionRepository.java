package com.soa.gr6.lms.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.soa.gr6.lms.domain.RefreshSession;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RefreshSessionRepository extends JpaRepository<RefreshSession, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from RefreshSession s join fetch s.user where s.id = :id")
    Optional<RefreshSession> findByIdForUpdate(@Param("id") UUID id);

    @Modifying
    @Query("update RefreshSession s set s.revokedAt = :now where s.familyId = :familyId and s.revokedAt is null")
    int revokeFamily(@Param("familyId") UUID familyId, @Param("now") Instant now);

    @Modifying
    @Query("update RefreshSession s set s.revokedAt = :now where s.user.id = :userId and s.revokedAt is null")
    int revokeAllForUser(@Param("userId") UUID userId, @Param("now") Instant now);

    @Modifying
    @Query("delete from RefreshSession s where s.expiresAt < :cutoff and (s.revokedAt is null or s.revokedAt < :cutoff)")
    int deleteExpiredBefore(@Param("cutoff") Instant cutoff);

    List<RefreshSession> findByUserIdAndRevokedAtIsNull(UUID userId);
}
