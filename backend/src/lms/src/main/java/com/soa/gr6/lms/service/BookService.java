package com.soa.gr6.lms.service;

import com.soa.gr6.lms.dto.BookRequest;
import com.soa.gr6.lms.dto.BookResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface BookService {
    BookResponse getBook(UUID bookId);

    /**
     * Searches active books using PostgreSQL FTS (with prefix matching and unaccent) and pg_trgm fuzzy matching.
     * Optionally filters by category and availability.
     */
    Page<BookResponse> searchBooks(String q, String category, String availability, Pageable pageable);

    /** Backward-compatible overload for listing / keyword searching active books. */
    default Page<BookResponse> searchBooks(String titleKeyword, Pageable pageable) {
        return searchBooks(titleKeyword, null, null, pageable);
    }

    /** Lists all distinct category names of active books. */
    List<String> getCategories();

    BookResponse createBook(BookRequest request);

    BookResponse updateBook(UUID bookId, BookRequest request);

    BookResponse updateCopyCounts(UUID bookId, int totalCopies, int availableCopies);

    BookResponse retireBook(UUID bookId);

    BookResponse activateBook(UUID bookId);
}
