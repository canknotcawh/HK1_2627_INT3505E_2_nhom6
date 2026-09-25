package com.soa.gr6.lms.repository;

import com.soa.gr6.lms.domain.Book;
import com.soa.gr6.lms.domain.enums.BookStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface BookRepository extends JpaRepository<Book, UUID> {
    Optional<Book> findByIsbn13(String isbn13);

    boolean existsByIsbn13(String isbn13);

    Page<Book> findByStatus(BookStatus status, Pageable pageable);

    Page<Book> findByStatusAndTitleContainingIgnoreCase(BookStatus status, String title, Pageable pageable);

    /** Row lock so concurrent borrows cannot oversell the last copy. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from Book b where b.id = :id")
    Optional<Book> findByIdForUpdate(@Param("id") UUID id);
}
