package com.soa.gr6.lms.repository;

import com.soa.gr6.lms.domain.CanaryToken;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CanaryTokenRepository extends JpaRepository<CanaryToken, UUID> {

    Optional<CanaryToken> findByTokenHash(String tokenHash);

    List<CanaryToken> findTop20ByTokenPrefixStartingWithOrderByIssuedAtDesc(String prefix);

    List<CanaryToken> findByUserIdAndRevokedAtIsNull(UUID userId);

    List<CanaryToken> findByUserIdAndBookIdAndRevokedAtIsNull(UUID userId, UUID bookId);

    @Query("""
            select t from CanaryToken t
            where (:bookId is null or t.book.id = :bookId)
              and (:userId is null or t.user.id = :userId)
              and (:q = '' or lower(t.tokenPrefix) like lower(concat('%', :q, '%'))
                   or lower(t.user.email) like lower(concat('%', :q, '%'))
                   or lower(t.book.title) like lower(concat('%', :q, '%')))
              and (:status = ''
                   or (:status = 'REVOKED' and t.revokedAt is not null)
                   or (:status = 'ACTIVE' and t.revokedAt is null and t.expiresAt > :now)
                   or (:status = 'EXPIRED' and t.revokedAt is null and t.expiresAt <= :now))
            """)
    Page<CanaryToken> search(@Param("bookId") UUID bookId,
                             @Param("userId") UUID userId,
                             @Param("status") String status,
                             @Param("q") String q,
                             @Param("now") Instant now,
                             Pageable pageable);
}
