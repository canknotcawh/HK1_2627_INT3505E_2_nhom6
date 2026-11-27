package com.soa.gr6.lms.repository;

import com.soa.gr6.lms.domain.CanaryAccess;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface CanaryAccessRepository extends JpaRepository<CanaryAccess, Long> {

    Page<CanaryAccess> findByTokenIdOrderByAccessedAtDesc(UUID tokenId, Pageable pageable);

    @Query("""
            select count(distinct a.ipHash) from CanaryAccess a
            where a.tokenId = :tokenId and a.outcome = com.soa.gr6.lms.domain.enums.CanaryOutcome.OK
            """)
    long countDistinctIps(@Param("tokenId") UUID tokenId);

    /** Số IP khác nhau của tất cả token mà một người đọc đã dùng cho cùng một sách. */
    @Query("""
            select count(distinct a.ipHash) from CanaryAccess a
            where a.outcome = com.soa.gr6.lms.domain.enums.CanaryOutcome.OK
              and a.tokenId in (select t.id from CanaryToken t
                                where t.book.id = :bookId and t.user.id = :userId)
            """)
    long countDistinctIpsForReader(@Param("bookId") UUID bookId, @Param("userId") UUID userId);
}
