package com.soa.gr6.lms.repository;

import com.soa.gr6.lms.domain.CanaryToken;
import com.soa.gr6.lms.dto.CanaryGroupRow;
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

    /**
     * Một trang nhóm (sách, người đọc), tìm được theo mã, email, họ tên hoặc tên sách.
     * Thứ tự cố định trong query; Pageable chỉ dùng cho LIMIT/OFFSET nên phân trang diễn ra ở DB.
     */
    @Query("""
            select new com.soa.gr6.lms.dto.CanaryGroupRow(
                t.book.id, t.book.title, t.user.id, t.user.email, t.user.fullName,
                count(t),
                coalesce(sum(t.accessCount), 0),
                coalesce(sum(case when t.revokedAt is null and t.expiresAt > :now then 1 else 0 end), 0),
                max(t.lastSeenAt),
                max(t.issuedAt))
            from CanaryToken t
            """ + CanaryGroupQueries.WHERE + CanaryGroupQueries.GROUP_BY)
    List<CanaryGroupRow> findGroups(@Param("bookId") UUID bookId,
                                    @Param("q") String q,
                                    @Param("now") Instant now,
                                    Pageable pageable);

    /** Tổng số nhóm khớp đúng bộ lọc của {@link #findGroups}; dùng chung {@link CanaryGroupQueries#WHERE}. */
    @Query(CanaryGroupQueries.COUNT)
    long countGroups(@Param("bookId") UUID bookId, @Param("q") String q);

    @Query("""
            select t from CanaryToken t
            where (:bookId is null or t.book.id = :bookId)
              and (:userId is null or t.user.id = :userId)
              and (:q = '' or lower(t.tokenPrefix) like lower(concat('%', :q, '%'))
                   or lower(t.user.email) like lower(concat('%', :q, '%'))
                   or lower(t.user.fullName) like lower(concat('%', :q, '%'))
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
