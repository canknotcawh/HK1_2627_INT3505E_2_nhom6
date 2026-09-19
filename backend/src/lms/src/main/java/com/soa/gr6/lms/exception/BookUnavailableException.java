package com.soa.gr6.lms.exception;

public class BookUnavailableException extends DomainException {
    private BookUnavailableException(String code, String message) {
        super(code, message);
    }

    public static BookUnavailableException retired() {
        return new BookUnavailableException("BOOK_RETIRED", "retired books cannot be borrowed");
    }

    public static BookUnavailableException noCopies() {
        return new BookUnavailableException("NO_COPIES_AVAILABLE", "no available copies");
    }
}
