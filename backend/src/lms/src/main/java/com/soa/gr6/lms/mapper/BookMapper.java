package com.soa.gr6.lms.mapper;

import com.soa.gr6.lms.domain.Author;
import com.soa.gr6.lms.domain.Book;
import com.soa.gr6.lms.domain.Category;
import com.soa.gr6.lms.domain.enums.BookFileKind;
import com.soa.gr6.lms.dto.BookResponse;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

@Component
public class BookMapper {
    public BookResponse toResponse(Book book) {
        return toResponse(book, Set.of());
    }

    /** {@code fileKinds} là các loại file PDF đang ACTIVE của sách. */
    public BookResponse toResponse(Book book, Set<BookFileKind> fileKinds) {
        List<String> authors = book.getAuthors() != null
                ? book.getAuthors().stream()
                        .map(Author::getName)
                        .sorted()
                        .toList()
                : List.of();
        List<String> categories = book.getCategories() != null
                ? book.getCategories().stream()
                        .map(Category::getName)
                        .sorted()
                        .toList()
                : List.of();
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
                book.getTotalCopies(),
                book.getAvailableCopies(),
                book.getRatingAvg(),
                book.getRatingCount(),
                book.getStatus().name(),
                book.getCreatedAt(),
                book.getUpdatedAt(),
                authors,
                categories,
                book.getGgId(),
                fileKinds.contains(BookFileKind.PREVIEW),
                fileKinds.contains(BookFileKind.FULL));
    }
}
