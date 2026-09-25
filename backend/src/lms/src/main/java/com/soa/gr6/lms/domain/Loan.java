package com.soa.gr6.lms.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import com.soa.gr6.lms.domain.enums.LoanStatus;
import com.soa.gr6.lms.exception.InvalidDomainStateException;
import com.soa.gr6.lms.exception.LoanRenewalException;
import com.soa.gr6.lms.exception.LoanStateException;
import com.soa.gr6.lms.exception.UserSuspendedException;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "loan")
@Getter
@NoArgsConstructor
public class Loan {
    public static final int MAX_RENEWALS = 1;

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "book_id", nullable = false)
    private Book book;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "borrowed_at", nullable = false, updatable = false)
    private Instant borrowedAt;

    @Column(name = "due_at", nullable = false)
    private Instant dueAt;

    @Column(name = "returned_at")
    private Instant returnedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private LoanStatus status = LoanStatus.ACTIVE;

    @Column(name = "renewed_count", nullable = false)
    private int renewedCount;

    public Loan(Book book, User user, Instant dueAt) {
        if (book == null || user == null || dueAt == null) {
            throw new InvalidDomainStateException(
                    "LOAN_FIELDS_REQUIRED", "book, user, and dueAt are required");
        }
        if (!user.getStatus().canBorrow()) {
            throw new UserSuspendedException();
        }
        Instant now = Instant.now();
        if (!dueAt.isAfter(now)) {
            throw new InvalidDomainStateException("DUE_DATE_INVALID", "dueAt must be after borrowedAt");
        }
        book.borrowCopy();
        this.book = book;
        this.user = user;
        this.borrowedAt = now;
        this.dueAt = dueAt;
    }

    public void returnBook(Instant returnedAt) {
        requireOpen();
        if (returnedAt == null) {
            throw new InvalidDomainStateException("RETURN_DATE_REQUIRED", "returnedAt is required");
        }
        book.returnCopy();
        this.returnedAt = returnedAt;
        this.status = LoanStatus.RETURNED;
    }

    public void markOverdue(Instant now) {
        if (status != LoanStatus.ACTIVE) {
            throw new LoanStateException("LOAN_NOT_ACTIVE", "only active loans can become overdue");
        }
        if (now == null || !now.isAfter(dueAt)) {
            throw new InvalidDomainStateException("OVERDUE_DATE_INVALID", "now must be after dueAt");
        }
        status = LoanStatus.OVERDUE;
    }

    public void markLost() {
        requireOpen();
        book.writeOffLostCopy();
        status = LoanStatus.LOST;
    }

    public void recoverLost(Instant returnedAt) {
        if (status != LoanStatus.LOST) {
            throw new LoanStateException("LOAN_NOT_LOST", "only lost loans can be recovered");
        }
        if (returnedAt == null) {
            throw new InvalidDomainStateException("RETURN_DATE_REQUIRED", "returnedAt is required");
        }
        book.recoverLostCopy();
        this.returnedAt = returnedAt;
        this.status = LoanStatus.RETURNED;
    }

    public void renew(Instant newDueAt) {
        if (status != LoanStatus.ACTIVE) {
            throw new LoanRenewalException(
                    "LOAN_NOT_RENEWABLE", "only active loans can be renewed");
        }
        if (renewedCount >= MAX_RENEWALS) {
            throw new LoanRenewalException("RENEWAL_LIMIT_REACHED", "loan renewal limit reached");
        }
        if (newDueAt == null || !newDueAt.isAfter(dueAt)) {
            throw new InvalidDomainStateException(
                    "NEW_DUE_DATE_INVALID", "newDueAt must be after dueAt");
        }
        dueAt = newDueAt;
        renewedCount++;
    }

    @PrePersist
    void onCreate() {
        if (borrowedAt == null) {
            borrowedAt = Instant.now();
        }
    }

    private void requireOpen() {
        if (!status.isOpen()) {
            throw new LoanStateException("LOAN_ALREADY_CLOSED", "loan is already closed");
        }
    }
}
