package com.soa.gr6.lms.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.junit.jupiter.api.Test;

import com.soa.gr6.lms.domain.enums.LoanStatus;
import com.soa.gr6.lms.exception.InvalidDomainStateException;
import com.soa.gr6.lms.exception.LoanRenewalException;
import com.soa.gr6.lms.exception.LoanStateException;

class LoanLifecycleTest {

    private static Loan newLoan(Book book) {
        return new Loan(book, new User("s", "a@b.com", "A"), Instant.now().plus(14, ChronoUnit.DAYS));
    }

    private static Book book() {
        Book book = new Book("t");
        book.updateCopyCounts(2, 2);
        return book;
    }

    @Test
    void overdueRequiresActiveAndPastDue() {
        Loan loan = newLoan(book());
        assertThatThrownBy(() -> loan.markOverdue(Instant.now())).isInstanceOf(InvalidDomainStateException.class);
        assertThatThrownBy(() -> loan.markOverdue(null)).isInstanceOf(InvalidDomainStateException.class);

        loan.markOverdue(loan.getDueAt().plusSeconds(1));
        assertThat(loan.getStatus()).isEqualTo(LoanStatus.OVERDUE);
        assertThatThrownBy(() -> loan.markOverdue(loan.getDueAt().plusSeconds(2)))
                .isInstanceOf(LoanStateException.class);
    }

    @Test
    void overdueLoanCanStillBeReturnedButNotRenewed() {
        Book book = book();
        Loan loan = newLoan(book);
        loan.markOverdue(loan.getDueAt().plusSeconds(1));
        assertThatThrownBy(() -> loan.renew(loan.getDueAt().plusSeconds(10))).isInstanceOf(LoanRenewalException.class);
        loan.returnBook(Instant.now());
        assertThat(loan.getStatus()).isEqualTo(LoanStatus.RETURNED);
        assertThat(book.getAvailableCopies()).isEqualTo(2);
    }

    @Test
    void lostThenRecovered() {
        Book book = book();
        Loan loan = newLoan(book);
        loan.markLost();
        assertThat(loan.getStatus()).isEqualTo(LoanStatus.LOST);
        assertThat(book.getTotalCopies()).isEqualTo(1);
        assertThatThrownBy(() -> loan.returnBook(Instant.now())).isInstanceOf(LoanStateException.class);

        assertThatThrownBy(() -> loan.recoverLost(null)).isInstanceOf(InvalidDomainStateException.class);
        loan.recoverLost(Instant.now());
        assertThat(loan.getStatus()).isEqualTo(LoanStatus.RETURNED);
        assertThat(book.getTotalCopies()).isEqualTo(2);
        assertThatThrownBy(() -> loan.recoverLost(Instant.now())).isInstanceOf(LoanStateException.class);
    }

    @Test
    void renewValidation() {
        Loan loan = newLoan(book());
        assertThatThrownBy(() -> loan.renew(null)).isInstanceOf(InvalidDomainStateException.class);
        assertThatThrownBy(() -> loan.renew(loan.getDueAt())).isInstanceOf(InvalidDomainStateException.class);
        loan.renew(loan.getDueAt().plus(14, ChronoUnit.DAYS));
        assertThat(loan.getRenewedCount()).isEqualTo(1);
        assertThatThrownBy(() -> loan.renew(loan.getDueAt().plus(14, ChronoUnit.DAYS)))
                .isInstanceOf(LoanRenewalException.class);
    }

    @Test
    void returnRequiresDate() {
        Loan loan = newLoan(book());
        assertThatThrownBy(() -> loan.returnBook(null)).isInstanceOf(InvalidDomainStateException.class);
    }
}
