package com.soa.gr6.lms.mapper;

import com.soa.gr6.lms.domain.Book;
import com.soa.gr6.lms.dto.BookResponse;
import org.springframework.stereotype.Component;

@Component
public class BookMapper {
    public BookResponse toResponse(Book book) {
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
                book.getStatus().name(),
                book.getCreatedAt(),
                book.getUpdatedAt());
    }
}
