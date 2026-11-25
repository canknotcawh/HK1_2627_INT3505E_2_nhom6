package com.soa.gr6.lms.repository;

import com.soa.gr6.lms.domain.CanaryReadingEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CanaryReadingEventRepository extends JpaRepository<CanaryReadingEvent, Long> {

    Page<CanaryReadingEvent> findByTokenIdOrderByOccurredAtDesc(UUID tokenId, Pageable pageable);
}
