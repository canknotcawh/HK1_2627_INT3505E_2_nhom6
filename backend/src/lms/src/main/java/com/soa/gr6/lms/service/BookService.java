package com.soa.gr6.lms.service;

import com.soa.gr6.lms.dto.BookRequest;
import com.soa.gr6.lms.dto.BookResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface BookService {
    BookResponse getBook(UUID bookId);

    /** Lists active books, optionally filtered by a case-insensitive title keyword. */
    Page<BookResponse> searchBooks(String titleKeyword, Pageable pageable);

    BookResponse createBook(BookRequest request);

    BookResponse updateBook(UUID bookId, BookRequest request);

    BookResponse updateCopyCounts(UUID bookId, int totalCopies, int availableCopies);

    BookResponse retireBook(UUID bookId);

    BookResponse activateBook(UUID bookId);
}
