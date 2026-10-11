package com.soa.gr6.lms.mapper;

import com.soa.gr6.lms.domain.Author;
import com.soa.gr6.lms.domain.Book;
import com.soa.gr6.lms.domain.Category;
import com.soa.gr6.lms.dto.BookResponse;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class BookMapper {
    public BookResponse toResponse(Book book) {
        List<String> authors = book.getAuthors().stream()
                .map(Author::getName)
                .sorted()
                .toList();
        List<String> categories = book.getCategories().stream()
                .map(Category::getName)
                .sorted()
                .toList();
        return new BookResponse(
                book.getId(),
                book.getIsbn13(),
                book.getTitle(),
                book.getSubtitle(),
                book.getDescription(),
                book.getLanguage(),
                book.getPublishedYear(),
                book.getPageCount(),
                book.getCoverImageUrl(),
                book.getPreviewUrl(),
                book.getReaderUrl(),
                book.getTotalCopies(),
                book.getAvailableCopies(),
                book.getRatingAvg(),
                book.getRatingCount(),
                book.getStatus().name(),
                book.getCreatedAt(),
                book.getUpdatedAt(),
                authors,
                categories);
    }
}
