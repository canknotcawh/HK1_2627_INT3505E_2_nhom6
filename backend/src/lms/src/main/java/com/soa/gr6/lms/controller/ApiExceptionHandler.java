package com.soa.gr6.lms.controller;

import com.soa.gr6.lms.exception.BookNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(BookNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleBookNotFound(BookNotFoundException exception) {
        return new ErrorResponse(exception.getCode(), "Không tìm thấy sách");
    }

    public record ErrorResponse(String code, String message) {
    }
}
