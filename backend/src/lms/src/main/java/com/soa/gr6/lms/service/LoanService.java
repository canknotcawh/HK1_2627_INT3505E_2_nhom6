package com.soa.gr6.lms.service;

import com.soa.gr6.lms.domain.enums.LoanStatus;
import com.soa.gr6.lms.dto.LoanResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface LoanService {
    LoanResponse borrowBook(UUID userId, UUID bookId);

    LoanResponse returnBook(UUID loanId);

    LoanResponse renewLoan(UUID loanId);

    LoanResponse markLost(UUID loanId);

    LoanResponse recoverLostLoan(UUID loanId);

    LoanResponse getLoan(UUID loanId);

    /** Lists a user's loans, optionally filtered by status (null = all). */
    Page<LoanResponse> listUserLoans(UUID userId, LoanStatus status, Pageable pageable);

    /** Flags every active loan past its due date as overdue; returns how many changed. */
    int markOverdueLoans();
}
