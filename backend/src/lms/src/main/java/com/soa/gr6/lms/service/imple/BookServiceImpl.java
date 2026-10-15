package com.soa.gr6.lms.service.imple;

import com.soa.gr6.lms.domain.Book;
import com.soa.gr6.lms.domain.enums.BookStatus;
import com.soa.gr6.lms.dto.BookRequest;
import com.soa.gr6.lms.dto.BookResponse;
import com.soa.gr6.lms.exception.BookNotFoundException;
import com.soa.gr6.lms.exception.DuplicateResourceException;
import com.soa.gr6.lms.mapper.BookMapper;
import com.soa.gr6.lms.repository.BookRepository;
import com.soa.gr6.lms.service.BookService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
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
        return bookMapper.toResponse(findBook(bookId));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<BookResponse> searchBooks(String q, String category, String availability, Pageable pageable) {
        Pageable unpagedSort = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        boolean hasQuery = q != null && !q.trim().isBlank();
        String sortCode = resolveSortCode(pageable, hasQuery);
        Page<Book> page;
        if (hasQuery) {
            page = bookRepository.searchBooks(q.trim(), category, availability, sortCode, unpagedSort);
        } else {
            page = bookRepository.filterBooks(category, availability, sortCode, unpagedSort);
        }
        return page.map(bookMapper::toResponse);
    }

    private String resolveSortCode(Pageable pageable, boolean hasQuery) {
        if (pageable != null && pageable.getSort() != null && pageable.getSort().isSorted()) {
            for (Sort.Order order : pageable.getSort()) {
                String prop = order.getProperty().toLowerCase().replace("_", "");
                boolean isAsc = order.isAscending();
                if ("title".equals(prop)) {
                    return isAsc ? "title_asc" : "title_desc";
                }
                if ("ratingavg".equals(prop) || "rating".equals(prop)) {
                    return isAsc ? "rating_asc" : "rating_desc";
                }
                if ("ratingcount".equals(prop)) {
                    return isAsc ? "rating_count_asc" : "rating_count_desc";
                }
                if ("publishedyear".equals(prop) || "year".equals(prop)) {
                    return isAsc ? "year_asc" : "year_desc";
                }
                if ("relevance".equals(prop) || "score".equals(prop)) {
                    return "relevance";
                }
            }
        }
        return hasQuery ? "relevance" : "title_asc";
    }

    @Override
    @Transactional(readOnly = true)
    public List<String> getCategories() {
        return bookRepository.findAllActiveCategoryNames();
    }

    @Override
    @Transactional
    public BookResponse createBook(BookRequest request) {
        Book book = new Book(request.title());
        applyMetadata(book, request);
        book.updateCopyCounts(request.totalCopies(), request.totalCopies());
        requireIsbnAvailable(book.getIsbn13(), null);
        return bookMapper.toResponse(bookRepository.save(book));
    }

    @Override
    @Transactional
    public BookResponse updateBook(UUID bookId, BookRequest request) {
        Book book = findBook(bookId);
        applyMetadata(book, request);
        requireIsbnAvailable(book.getIsbn13(), book.getId());
        return bookMapper.toResponse(book);
    }

    @Override
    @Transactional
    public BookResponse updateCopyCounts(UUID bookId, int totalCopies, int availableCopies) {
        Book book = bookRepository.findByIdForUpdate(bookId).orElseThrow(() -> new BookNotFoundException(bookId));
        book.updateCopyCounts(totalCopies, availableCopies);
        return bookMapper.toResponse(book);
    }

    @Override
    @Transactional
    public BookResponse retireBook(UUID bookId) {
        Book book = findBook(bookId);
        book.retire();
        return bookMapper.toResponse(book);
    }

    @Override
    @Transactional
    public BookResponse activateBook(UUID bookId) {
        Book book = findBook(bookId);
        book.activate();
        return bookMapper.toResponse(book);
    }

    private Book findBook(UUID bookId) {
        return bookRepository.findById(bookId).orElseThrow(() -> new BookNotFoundException(bookId));
    }

    private void applyMetadata(Book book, BookRequest request) {
        book.updateMetadata(
                request.isbn13(),
                request.title(),
                request.subtitle(),
                request.description(),
                request.language(),
                request.publishedYear(),
                request.pageCount(),
                request.coverImageUrl(),
                request.previewUrl(),
                request.readerUrl());
    }

    private void requireIsbnAvailable(String isbn13, UUID ownBookId) {
        if (isbn13 == null) {
            return;
        }
        bookRepository.findByIsbn13(isbn13)
                .filter(existing -> !existing.getId().equals(ownBookId))
                .ifPresent(existing -> {
                    throw new DuplicateResourceException(
                            "ISBN13_ALREADY_EXISTS", "a book with this isbn13 already exists");
                });
    }
}
