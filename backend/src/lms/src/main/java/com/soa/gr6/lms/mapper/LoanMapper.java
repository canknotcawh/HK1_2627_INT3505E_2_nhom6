package com.soa.gr6.lms.mapper;

import com.soa.gr6.lms.domain.Loan;
import com.soa.gr6.lms.dto.LoanResponse;
import org.springframework.stereotype.Component;

@Component
public class LoanMapper {
    public LoanResponse toResponse(Loan loan) {
        return new LoanResponse(
                loan.getId(),
                loan.getBook().getId(),
                loan.getBook().getTitle(),
                loan.getUser().getId(),
                loan.getBorrowedAt(),
                loan.getDueAt(),
                loan.getReturnedAt(),
                loan.getStatus().name(),
                loan.getRenewedCount());
    }
}
