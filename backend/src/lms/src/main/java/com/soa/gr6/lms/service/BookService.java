package com.soa.gr6.lms.service;

import com.soa.gr6.lms.dto.BookResponse;

import java.util.UUID;

public interface BookService {
    BookResponse getBook(UUID bookId);
}
