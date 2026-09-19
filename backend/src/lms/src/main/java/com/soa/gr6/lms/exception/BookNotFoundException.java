package com.soa.gr6.lms.exception;

import java.util.UUID;

public class BookNotFoundException extends DomainException {
    public BookNotFoundException(UUID bookId) {
        super("BOOK_NOT_FOUND", "Book not found: " + bookId);
    }
}
