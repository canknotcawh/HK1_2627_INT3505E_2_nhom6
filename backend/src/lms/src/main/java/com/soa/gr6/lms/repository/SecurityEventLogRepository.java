package com.soa.gr6.lms.repository;

import com.soa.gr6.lms.domain.SecurityEventLog;
import com.soa.gr6.lms.domain.enums.SecurityEventSeverity;
import com.soa.gr6.lms.domain.enums.SecurityEventType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface SecurityEventLogRepository extends JpaRepository<SecurityEventLog, UUID> {

    @Query("""
            SELECT e FROM SecurityEventLog e
            WHERE (:eventType IS NULL OR e.eventType = :eventType)
              AND (:severity IS NULL OR e.severity = :severity)
              AND (:userId IS NULL OR e.user.id = :userId)
            """)
    Page<SecurityEventLog> findFiltered(
            @Param("eventType") SecurityEventType eventType,
            @Param("severity") SecurityEventSeverity severity,
            @Param("userId") UUID userId,
            Pageable pageable);
}

