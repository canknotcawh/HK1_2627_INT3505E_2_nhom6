package com.soa.gr6.lms.service.imple;

import com.soa.gr6.lms.domain.Book;
import com.soa.gr6.lms.domain.Loan;
import com.soa.gr6.lms.domain.User;
import com.soa.gr6.lms.domain.enums.LoanStatus;
import com.soa.gr6.lms.dto.LoanResponse;
import com.soa.gr6.lms.exception.BookNotFoundException;
import com.soa.gr6.lms.exception.DuplicateResourceException;
import com.soa.gr6.lms.exception.LoanNotFoundException;
import com.soa.gr6.lms.exception.ApiException;
import com.soa.gr6.lms.exception.ErrorCode;
import com.soa.gr6.lms.mapper.LoanMapper;
import com.soa.gr6.lms.repository.BookRepository;
import com.soa.gr6.lms.repository.LoanRepository;
import com.soa.gr6.lms.repository.UserRepository;
import com.soa.gr6.lms.service.LoanService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.UUID;

@Service
public class LoanServiceImpl implements LoanService {
    static final Duration LOAN_PERIOD = Duration.ofDays(14);
    private static final EnumSet<LoanStatus> OPEN_STATUSES = EnumSet.of(LoanStatus.ACTIVE, LoanStatus.OVERDUE);

    private final LoanRepository loanRepository;
    private final BookRepository bookRepository;
    private final UserRepository userRepository;
    private final LoanMapper loanMapper;

    public LoanServiceImpl(
            LoanRepository loanRepository,
            BookRepository bookRepository,
            UserRepository userRepository,
            LoanMapper loanMapper) {
        this.loanRepository = loanRepository;
        this.bookRepository = bookRepository;
        this.userRepository = userRepository;
        this.loanMapper = loanMapper;
    }

    @Override
    @Transactional
    public LoanResponse borrowBook(UUID userId, UUID bookId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));
        Book book = bookRepository.findByIdForUpdate(bookId).orElseThrow(() -> new BookNotFoundException(bookId));
        if (loanRepository.existsByUserIdAndBookIdAndStatusIn(userId, bookId, OPEN_STATUSES)) {
            throw new DuplicateResourceException(
                    "LOAN_ALREADY_OPEN", "user already has an open loan for this book");
        }
        Loan loan = new Loan(book, user, Instant.now().plus(LOAN_PERIOD));
        return loanMapper.toResponse(loanRepository.save(loan));
    }

    @Override
    @Transactional
    public LoanResponse returnBook(UUID loanId) {
        Loan loan = findLoanLockingBook(loanId);
        loan.returnBook(Instant.now());
        return loanMapper.toResponse(loan);
    }

    @Override
    @Transactional
    public LoanResponse renewLoan(UUID loanId) {
        Loan loan = findLoan(loanId);
        loan.renew(loan.getDueAt().plus(LOAN_PERIOD));
        return loanMapper.toResponse(loan);
    }

    @Override
    @Transactional
    public LoanResponse markLost(UUID loanId) {
        Loan loan = findLoanLockingBook(loanId);
        loan.markLost();
        return loanMapper.toResponse(loan);
    }

    @Override
    @Transactional
    public LoanResponse recoverLostLoan(UUID loanId) {
        Loan loan = findLoanLockingBook(loanId);
        loan.recoverLost(Instant.now());
        return loanMapper.toResponse(loan);
    }

    @Override
    @Transactional(readOnly = true)
    public LoanResponse getLoan(UUID loanId) {
        return loanMapper.toResponse(findLoan(loanId));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<LoanResponse> listUserLoans(UUID userId, LoanStatus status, Pageable pageable) {
        Page<Loan> page = status == null
                ? loanRepository.findByUserId(userId, pageable)
                : loanRepository.findByUserIdAndStatus(userId, status, pageable);
        return page.map(loanMapper::toResponse);
    }

    @Override
    @Transactional
    public int markOverdueLoans() {
        Instant now = Instant.now();
        List<Loan> late = loanRepository.findByStatusAndDueAtBefore(LoanStatus.ACTIVE, now);
        late.forEach(loan -> loan.markOverdue(now));
        return late.size();
    }

    private Loan findLoan(UUID loanId) {
        return loanRepository.findById(loanId).orElseThrow(() -> new LoanNotFoundException(loanId));
    }

    /** Loads the loan, then row-locks its book because the operation changes copy counts. */
    private Loan findLoanLockingBook(UUID loanId) {
        Loan loan = findLoan(loanId);
        UUID bookId = loan.getBook().getId();
        bookRepository.findByIdForUpdate(bookId).orElseThrow(() -> new BookNotFoundException(bookId));
        return loan;
    }
}
