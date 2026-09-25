package com.soa.gr6.lms.controller.admin;

import com.soa.gr6.lms.domain.enums.LoanStatus;
import com.soa.gr6.lms.dto.LoanResponse;
import com.soa.gr6.lms.service.LoanService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminLoanController {
    private final LoanService loanService;

    public AdminLoanController(LoanService loanService) {
        this.loanService = loanService;
    }

    @GetMapping("/loans/{loanId}")
    public LoanResponse getLoan(@PathVariable UUID loanId) {
        return loanService.getLoan(loanId);
    }

    @GetMapping("/users/{userId}/loans")
    public Page<LoanResponse> listUserLoans(
            @PathVariable UUID userId,
            @RequestParam(required = false) LoanStatus status,
            @PageableDefault(size = 20, sort = "borrowedAt") Pageable pageable) {
        return loanService.listUserLoans(userId, status, pageable);
    }

    @PostMapping("/loans/{loanId}/return")
    public LoanResponse returnBook(@PathVariable UUID loanId) {
        return loanService.returnBook(loanId);
    }

    @PostMapping("/loans/{loanId}/lost")
    public LoanResponse markLost(@PathVariable UUID loanId) {
        return loanService.markLost(loanId);
    }

    @PostMapping("/loans/{loanId}/recover")
    public LoanResponse recoverLost(@PathVariable UUID loanId) {
        return loanService.recoverLostLoan(loanId);
    }

    @PostMapping("/loans/mark-overdue")
    public Map<String, Integer> markOverdue() {
        return Map.of("updated", loanService.markOverdueLoans());
    }
}
