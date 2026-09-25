package com.soa.gr6.lms.repository;

import com.soa.gr6.lms.domain.Loan;
import com.soa.gr6.lms.domain.enums.LoanStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface LoanRepository extends JpaRepository<Loan, UUID> {
    Page<Loan> findByUserId(UUID userId, Pageable pageable);

    Page<Loan> findByUserIdAndStatus(UUID userId, LoanStatus status, Pageable pageable);

    boolean existsByUserIdAndBookIdAndStatusIn(UUID userId, UUID bookId, Collection<LoanStatus> statuses);

    long countByUserIdAndStatusIn(UUID userId, Collection<LoanStatus> statuses);

    List<Loan> findByStatusAndDueAtBefore(LoanStatus status, Instant threshold);
}
