package com.soa.gr6.lms.domain;

import com.soa.gr6.lms.domain.enums.LoanStatus;
import com.soa.gr6.lms.exception.BookUnavailableException;
import com.soa.gr6.lms.exception.InvalidDomainStateException;
import com.soa.gr6.lms.exception.LoanRenewalException;
import com.soa.gr6.lms.exception.UserSuspendedException;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LoanDomainTest {
    private static Book bookWithCopies(int total) {
        Book book = new Book("Clean Code");
        book.updateCopyCounts(total, total);
        return book;
    }

    private static User user() {
        return new User("sub-1", "a@b.com", "A B");
    }

    private static Instant inDays(int days) {
        return Instant.now().plus(days, ChronoUnit.DAYS);
    }

    @Test
    void borrowTakesOneCopy() {
        Book book = bookWithCopies(2);
        new Loan(book, user(), inDays(14));
        assertThat(book.getAvailableCopies()).isEqualTo(1);
    }

    @Test
    void invalidDueDateDoesNotTouchBook() {
        Book book = bookWithCopies(1);
        assertThatThrownBy(() -> new Loan(book, user(), Instant.now().minusSeconds(5)))
                .isInstanceOf(InvalidDomainStateException.class);
        assertThat(book.getAvailableCopies()).isEqualTo(1);
    }

    @Test
    void suspendedUserCannotBorrow() {
        User user = user();
        user.suspend();
        assertThatThrownBy(() -> new Loan(bookWithCopies(1), user, inDays(14)))
                .isInstanceOf(UserSuspendedException.class);
    }

    @Test
    void retiredBookCannotBeBorrowed() {
        Book book = bookWithCopies(1);
        book.retire();
        assertThatThrownBy(() -> new Loan(book, user(), inDays(14)))
                .isInstanceOf(BookUnavailableException.class);
    }

    @Test
    void returnRestoresCopy() {
        Book book = bookWithCopies(1);
        Loan loan = new Loan(book, user(), inDays(14));
        loan.returnBook(Instant.now());
        assertThat(loan.getStatus()).isEqualTo(LoanStatus.RETURNED);
        assertThat(book.getAvailableCopies()).isEqualTo(1);
    }

    @Test
    void lostLoanWritesOffCopyAndRecoveryRestoresIt() {
        Book book = bookWithCopies(2);
        Loan loan = new Loan(book, user(), inDays(14));
        loan.markLost();
        assertThat(book.getTotalCopies()).isEqualTo(1);
        assertThat(book.getAvailableCopies()).isEqualTo(1);

        loan.recoverLost(Instant.now());
        assertThat(loan.getStatus()).isEqualTo(LoanStatus.RETURNED);
        assertThat(book.getTotalCopies()).isEqualTo(2);
        assertThat(book.getAvailableCopies()).isEqualTo(2);
    }

    @Test
    void onlyActiveLoansBecomeOverdue() {
        Loan loan = new Loan(bookWithCopies(1), user(), inDays(1));
        loan.markOverdue(inDays(2));
        assertThat(loan.getStatus()).isEqualTo(LoanStatus.OVERDUE);
        assertThatThrownBy(() -> loan.markOverdue(inDays(3))).isNotNull();
    }

    @Test
    void renewalIsLimited() {
        Loan loan = new Loan(bookWithCopies(1), user(), inDays(14));
        loan.renew(inDays(28));
        assertThat(loan.getRenewedCount()).isEqualTo(Loan.MAX_RENEWALS);
        assertThatThrownBy(() -> loan.renew(inDays(42))).isInstanceOf(LoanRenewalException.class);
    }

    @Test
    void metadataValidation() {
        Book book = bookWithCopies(1);
        assertThatThrownBy(() -> book.updateMetadata("123", "T", null, null, null, null, null, null))
                .isInstanceOf(InvalidDomainStateException.class);
        assertThatThrownBy(() -> book.updateMetadata(null, "T", null, null, null, 12, null, null))
                .isInstanceOf(InvalidDomainStateException.class);
        book.updateMetadata("9780132350884", "T", null, null, "en", 2008, 464, null);
        assertThat(book.getIsbn13()).isEqualTo("9780132350884");
    }
}
