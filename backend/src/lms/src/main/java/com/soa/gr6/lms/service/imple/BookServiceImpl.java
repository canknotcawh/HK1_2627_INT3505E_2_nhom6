package com.soa.gr6.lms.service.imple;

import com.soa.gr6.lms.dto.BookResponse;
import com.soa.gr6.lms.exception.BookNotFoundException;
import com.soa.gr6.lms.mapper.BookMapper;
import com.soa.gr6.lms.repository.BookRepository;
import com.soa.gr6.lms.service.BookService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class BookServiceImpl implements BookService {
    private final BookRepository bookRepository;
    private final BookMapper bookMapper;

    public BookServiceImpl(BookRepository bookRepository, BookMapper bookMapper) {
        this.bookRepository = bookRepository;
        this.bookMapper = bookMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public BookResponse getBook(UUID bookId) {
        return bookRepository.findById(bookId)
                .map(bookMapper::toResponse)
                .orElseThrow(() -> new BookNotFoundException(bookId));
    }
}
