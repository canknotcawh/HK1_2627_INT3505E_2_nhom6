package com.soa.gr6.lms.controller.identity;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.soa.gr6.lms.domain.enums.LoanStatus;
import com.soa.gr6.lms.dto.LoanResponse;
import com.soa.gr6.lms.dto.UserResponse;
import com.soa.gr6.lms.exception.LoanNotFoundException;
import com.soa.gr6.lms.security.AuthenticatedUser;
import com.soa.gr6.lms.service.LoanService;
import com.soa.gr6.lms.service.identity.UserService;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;
    private final LoanService loanService;

    public UserController(UserService userService, LoanService loanService) {
        this.userService = userService;
        this.loanService = loanService;
    }

    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal AuthenticatedUser principal) {
        return userService.getCurrentUser(principal.id());
    }

    @GetMapping("/me/loans")
    public Page<LoanResponse> listMyLoans(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(required = false) LoanStatus status,
            @PageableDefault(size = 20, sort = "borrowedAt") Pageable pageable) {
        return loanService.listUserLoans(principal.id(), status, pageable);
    }

    @PostMapping("/me/loans")
    @ResponseStatus(HttpStatus.CREATED)
    public LoanResponse borrow(
            @AuthenticationPrincipal AuthenticatedUser principal, @RequestBody BorrowRequest request) {
        return loanService.borrowBook(principal.id(), request.bookId());
    }

    @PostMapping("/me/loans/{loanId}/return")
    public LoanResponse returnBook(@AuthenticationPrincipal AuthenticatedUser principal, @PathVariable UUID loanId) {
        requireOwnLoan(principal, loanId);
        return loanService.returnBook(loanId);
    }

    @PostMapping("/me/loans/{loanId}/renew")
    public LoanResponse renew(@AuthenticationPrincipal AuthenticatedUser principal, @PathVariable UUID loanId) {
        requireOwnLoan(principal, loanId);
        return loanService.renewLoan(loanId);
    }

    private void requireOwnLoan(AuthenticatedUser principal, UUID loanId) {
        if (!loanService.getLoan(loanId).userId().equals(principal.id())) {
            throw new LoanNotFoundException(loanId);
        }
    }

    public record BorrowRequest(UUID bookId) {
    }
}
