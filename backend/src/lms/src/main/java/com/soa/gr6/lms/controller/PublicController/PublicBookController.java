package com.soa.gr6.lms.controller.PublicController;

import com.soa.gr6.lms.dto.BookResponse;
import com.soa.gr6.lms.service.BookService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/public/books")
public class PublicBookController {
    private final BookService bookService;

    public PublicBookController(BookService bookService) {
        this.bookService = bookService;
    }

    @GetMapping("/{bookId}")
    public BookResponse getBook(@PathVariable UUID bookId) {
        return bookService.getBook(bookId);
    }
}
