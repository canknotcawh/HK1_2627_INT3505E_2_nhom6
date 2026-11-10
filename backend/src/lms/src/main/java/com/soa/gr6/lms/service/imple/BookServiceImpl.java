package com.soa.gr6.lms.service.imple;

import com.soa.gr6.lms.domain.Book;
import com.soa.gr6.lms.dto.BookRequest;
import com.soa.gr6.lms.dto.BookResponse;
import com.soa.gr6.lms.exception.BookNotFoundException;
import com.soa.gr6.lms.exception.DuplicateResourceException;
import com.soa.gr6.lms.mapper.BookMapper;
import com.soa.gr6.lms.domain.Category;
import com.soa.gr6.lms.repository.BookRepository;
import com.soa.gr6.lms.repository.CategoryRepository;
import com.soa.gr6.lms.service.BookService;
import com.soa.gr6.lms.service.support.PageableSupport;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class BookServiceImpl implements BookService {
    private static final int MAX_PAGE_SIZE = 100;
    private final BookRepository bookRepository;
    private final BookMapper bookMapper;
    private final CategoryRepository categoryRepository;

    public BookServiceImpl(BookRepository bookRepository, BookMapper bookMapper,
            CategoryRepository categoryRepository) {
        this.bookRepository = bookRepository;
        this.bookMapper = bookMapper;
        this.categoryRepository = categoryRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public BookResponse getBook(UUID bookId) {
        return bookMapper.toResponse(findBook(bookId));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<BookResponse> searchBooks(String titleKeyword, Pageable pageable) {
        return searchBooks(titleKeyword, null, null, pageable);
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
    @Transactional(readOnly = true)
    public Page<BookResponse> listAdminBooks(String q, Pageable pageable) {
        Pageable clamped = PageableSupport.clamp(pageable, MAX_PAGE_SIZE);
        Page<Book> page = q == null || q.trim().isBlank()
                ? bookRepository.findAll(clamped)
                : bookRepository.findByTitleContainingIgnoreCaseOrIsbn13ContainingIgnoreCase(
                        q.trim(), q.trim(), clamped);
        return page.map(bookMapper::toResponse);
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
                request.coverImageUrl());
        if (request.categories() != null) {
            book.replaceCategories(resolveCategories(request.categories()));
        }
    }

    /** Reuses existing categories (case-insensitive) and creates the ones that do not exist yet. */
    private Set<Category> resolveCategories(List<String> names) {
        Set<Category> result = new LinkedHashSet<>();
        for (String raw : names) {
            String name = raw.trim();
            if (name.isEmpty()) {
                continue;
            }
            result.add(categoryRepository.findByNameIgnoreCase(name)
                    .orElseGet(() -> categoryRepository.save(new Category(name))));
        }
        return result;
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
