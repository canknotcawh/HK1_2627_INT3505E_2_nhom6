package com.soa.gr6.lms.service.imple;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.lang.reflect.Field;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import com.soa.gr6.lms.domain.Book;
import com.soa.gr6.lms.domain.Loan;
import com.soa.gr6.lms.domain.User;
import com.soa.gr6.lms.domain.enums.LoanStatus;
import com.soa.gr6.lms.exception.ApiException;
import com.soa.gr6.lms.exception.BookNotFoundException;
import com.soa.gr6.lms.exception.DuplicateResourceException;
import com.soa.gr6.lms.exception.LoanNotFoundException;
import com.soa.gr6.lms.mapper.LoanMapper;
import com.soa.gr6.lms.repository.BookRepository;
import com.soa.gr6.lms.repository.LoanRepository;
import com.soa.gr6.lms.repository.UserRepository;

class LoanServiceImplTest {
    private final LoanRepository loanRepository = mock(LoanRepository.class);
    private final BookRepository bookRepository = mock(BookRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final LoanServiceImpl service =
            new LoanServiceImpl(loanRepository, bookRepository, userRepository, new LoanMapper());
    private final Pageable page = PageRequest.of(0, 10);

    private final UUID userId = UUID.randomUUID();
    private final UUID bookId = UUID.randomUUID();
    private Book book;
    private User user;

    @BeforeEach
    void setUp() throws Exception {
        book = new Book(bookId, "Clean Code");
        book.updateCopyCounts(2, 2);
        user = new User("sub", "a@b.com", "A");
        setField(user, "id", userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(bookRepository.findByIdForUpdate(bookId)).thenReturn(Optional.of(book));
        when(loanRepository.save(any(Loan.class))).thenAnswer(i -> i.getArgument(0));
    }

    private static void setField(Object target, String name, Object value) throws Exception {
        Field f = target.getClass().getDeclaredField(name);
        f.setAccessible(true);
        f.set(target, value);
    }

    private Loan storedLoan() throws Exception {
        Loan loan = new Loan(book, user, Instant.now().plus(14, ChronoUnit.DAYS));
        UUID id = UUID.randomUUID();
        setField(loan, "id", id);
        when(loanRepository.findById(id)).thenReturn(Optional.of(loan));
        return loan;
    }

    @Test
    void borrowCreatesLoanForFourteenDays() {
        var response = service.borrowBook(userId, bookId);
        assertThat(response.status()).isEqualTo("ACTIVE");
        assertThat(response.dueAt()).isAfter(Instant.now().plus(13, ChronoUnit.DAYS));
        assertThat(book.getAvailableCopies()).isEqualTo(1);
    }

    @Test
    void borrowFailsForUnknownUserOrBook() {
        UUID other = UUID.randomUUID();
        when(userRepository.findById(other)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.borrowBook(other, bookId)).isInstanceOf(ApiException.class);

        UUID missingBook = UUID.randomUUID();
        when(bookRepository.findByIdForUpdate(missingBook)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.borrowBook(userId, missingBook)).isInstanceOf(BookNotFoundException.class);
    }

    @Test
    void borrowRejectsSecondOpenLoanOfSameBook() {
        when(loanRepository.existsByUserIdAndBookIdAndStatusIn(eq(userId), eq(bookId), any())).thenReturn(true);
        assertThatThrownBy(() -> service.borrowBook(userId, bookId)).isInstanceOf(DuplicateResourceException.class);
        assertThat(book.getAvailableCopies()).isEqualTo(2);
    }

    @Test
    void returnGivesCopyBack() throws Exception {
        Loan loan = storedLoan();
        book.updateCopyCounts(2, 1);
        var response = service.returnBook(loan.getId());
        assertThat(response.status()).isEqualTo("RETURNED");
        assertThat(book.getAvailableCopies()).isEqualTo(2);
    }

    @Test
    void renewExtendsByOnePeriod() throws Exception {
        Loan loan = storedLoan();
        Instant before = loan.getDueAt();
        var response = service.renewLoan(loan.getId());
        assertThat(response.renewedCount()).isEqualTo(1);
        assertThat(response.dueAt()).isEqualTo(before.plus(LoanServiceImpl.LOAN_PERIOD));
    }

    @Test
    void lostAndRecover() throws Exception {
        Loan loan = storedLoan();
        book.updateCopyCounts(2, 1);
        assertThat(service.markLost(loan.getId()).status()).isEqualTo("LOST");
        assertThat(service.recoverLostLoan(loan.getId()).status()).isEqualTo("RETURNED");
    }

    @Test
    void getLoanThrowsWhenMissing() {
        UUID id = UUID.randomUUID();
        when(loanRepository.findById(id)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getLoan(id)).isInstanceOf(LoanNotFoundException.class);
        assertThatThrownBy(() -> service.returnBook(id)).isInstanceOf(LoanNotFoundException.class);
    }

    @Test
    void getLoanReturnsMappedLoan() throws Exception {
        Loan loan = storedLoan();
        assertThat(service.getLoan(loan.getId()).bookTitle()).isEqualTo("Clean Code");
    }

    @Test
    void listUserLoansFiltersByStatusOnlyWhenGiven() throws Exception {
        Loan loan = storedLoan();
        when(loanRepository.findByUserId(userId, page)).thenReturn(new PageImpl<>(List.of(loan)));
        when(loanRepository.findByUserIdAndStatus(userId, LoanStatus.RETURNED, page))
                .thenReturn(new PageImpl<>(List.of()));
        assertThat(service.listUserLoans(userId, null, page).getContent()).hasSize(1);
        assertThat(service.listUserLoans(userId, LoanStatus.RETURNED, page).getContent()).isEmpty();
    }

    @Test
    void listLoansFiltersByStatusOnlyWhenGiven() throws Exception {
        Loan loan = storedLoan();
        when(loanRepository.findAll(page)).thenReturn(new PageImpl<>(List.of(loan)));
        when(loanRepository.findByStatus(LoanStatus.PENDING_RETURN, page))
                .thenReturn(new PageImpl<>(List.of()));
        assertThat(service.listLoans(null, page).getContent()).hasSize(1);
        assertThat(service.listLoans(LoanStatus.PENDING_RETURN, page).getContent()).isEmpty();
    }

    @Test
    void requestReturnMovesLoanToPendingWithoutTouchingTheBook() throws Exception {
        Loan loan = storedLoan();
        var response = service.requestReturn(loan.getId());
        assertThat(response.status()).isEqualTo("PENDING_RETURN");
        assertThat(book.getAvailableCopies()).isEqualTo(1);
    }

    @Test
    void rejectReturnRequestSendsLoanBackToActive() throws Exception {
        Loan loan = storedLoan();
        loan.requestReturn();
        var response = service.rejectReturnRequest(loan.getId());
        assertThat(response.status()).isEqualTo("ACTIVE");
    }

    @Test
    void markOverdueFlagsLateActiveLoans() throws Exception {
        Loan late = new Loan(book, user, Instant.now().plusSeconds(60));
        setField(late, "dueAt", Instant.now().minusSeconds(60));
        when(loanRepository.findByStatusAndDueAtBefore(eq(LoanStatus.ACTIVE), any())).thenReturn(List.of(late));

        assertThat(service.markOverdueLoans()).isEqualTo(1);
        assertThat(late.getStatus()).isEqualTo(LoanStatus.OVERDUE);
    }
}
