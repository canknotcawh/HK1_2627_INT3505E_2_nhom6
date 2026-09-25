package com.soa.gr6.lms.controller.admin;

import com.soa.gr6.lms.dto.BookRequest;
import com.soa.gr6.lms.dto.BookResponse;
import com.soa.gr6.lms.service.BookService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/books")
public class AdminBookController {
    private final BookService bookService;

    public AdminBookController(BookService bookService) {
        this.bookService = bookService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BookResponse createBook(@RequestBody BookRequest request) {
        return bookService.createBook(request);
    }

    @PutMapping("/{bookId}")
    public BookResponse updateBook(@PathVariable UUID bookId, @RequestBody BookRequest request) {
        return bookService.updateBook(bookId, request);
    }

    @PatchMapping("/{bookId}/copies")
    public BookResponse updateCopyCounts(@PathVariable UUID bookId, @RequestBody CopyCountsRequest request) {
        return bookService.updateCopyCounts(bookId, request.totalCopies(), request.availableCopies());
    }

    @PostMapping("/{bookId}/retire")
    public BookResponse retireBook(@PathVariable UUID bookId) {
        return bookService.retireBook(bookId);
    }

    @PostMapping("/{bookId}/activate")
    public BookResponse activateBook(@PathVariable UUID bookId) {
        return bookService.activateBook(bookId);
    }

    public record CopyCountsRequest(int totalCopies, int availableCopies) {
    }
}
