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
}
