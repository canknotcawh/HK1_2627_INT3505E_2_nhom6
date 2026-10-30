package com.soa.gr6.lms.service;

import com.soa.gr6.lms.dto.BookRequest;
import com.soa.gr6.lms.dto.BookResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface BookService {
    BookResponse getBook(UUID bookId);

    Page<BookResponse> searchBooks(String q, String category, String availability, Pageable pageable);

    default Page<BookResponse> searchBooks(String titleKeyword, Pageable pageable) {
        return searchBooks(titleKeyword, null, null, pageable);
    }

    List<String> getCategories();

    Page<BookResponse> listAdminBooks(String q, Pageable pageable);

    BookResponse createBook(BookRequest request);

    BookResponse updateBook(UUID bookId, BookRequest request);

    BookResponse updateCopyCounts(UUID bookId, int totalCopies, int availableCopies);

    BookResponse retireBook(UUID bookId);

    BookResponse activateBook(UUID bookId);
}
