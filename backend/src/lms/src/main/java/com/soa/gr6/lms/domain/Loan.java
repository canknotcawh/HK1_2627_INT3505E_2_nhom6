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
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import com.soa.gr6.lms.domain.enums.LoanStatus;
import com.soa.gr6.lms.domain.enums.UserStatus;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "loan")
@Getter
@NoArgsConstructor
public class Loan {
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
            throw new IllegalArgumentException("book, user, and dueAt are required");
        }
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new IllegalStateException("suspended users cannot borrow books");
        }
        this.book = book;
        this.user = user;
        this.borrowedAt = Instant.now();
        if (!dueAt.isAfter(borrowedAt)) {
            throw new IllegalArgumentException("dueAt must be after borrowedAt");
        }
        book.borrowCopy();
        this.dueAt = dueAt;
    }

    public void returnBook(Instant returnedAt) {
        requireOpen();
        if (returnedAt == null) {
            throw new IllegalArgumentException("returnedAt is required");
        }
        book.returnCopy();
        this.returnedAt = returnedAt;
        this.status = LoanStatus.RETURNED;
    }

    public void markOverdue(Instant now) {
        requireOpen();
        if (now == null || !now.isAfter(dueAt)) {
            throw new IllegalArgumentException("now must be after dueAt");
        }
        status = LoanStatus.OVERDUE;
    }

    public void markLost() {
        requireOpen();
        status = LoanStatus.LOST;
    }

    public void renew(Instant newDueAt) {
        if (status != LoanStatus.ACTIVE) {
            throw new IllegalStateException("only active loans can be renewed");
        }
        if (renewedCount >= 1) {
            throw new IllegalStateException("loan renewal limit reached");
        }
        if (newDueAt == null || !newDueAt.isAfter(dueAt)) {
            throw new IllegalArgumentException("newDueAt must be after dueAt");
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

    @PreUpdate
    void onUpdate() {
        if (status == LoanStatus.RETURNED && returnedAt == null) {
            returnedAt = Instant.now();
        }
    }

    private void requireOpen() {
        if (status != LoanStatus.ACTIVE && status != LoanStatus.OVERDUE) {
            throw new IllegalStateException("loan is already closed");
        }
    }

}
