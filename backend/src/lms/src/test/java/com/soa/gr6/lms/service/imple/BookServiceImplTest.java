package com.soa.gr6.lms.service.imple;

import com.soa.gr6.lms.domain.Book;
import com.soa.gr6.lms.dto.BookResponse;
import com.soa.gr6.lms.mapper.BookMapper;
import com.soa.gr6.lms.repository.BookRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class BookServiceImplTest {

    private BookRepository bookRepository;
    private BookMapper bookMapper;
    private BookServiceImpl bookService;

    @BeforeEach
    void setUp() {
        bookRepository = mock(BookRepository.class);
        bookMapper = mock(BookMapper.class);
        bookService = new BookServiceImpl(bookRepository, bookMapper);

        Page<Book> emptyPage = new PageImpl<>(Collections.emptyList());
        when(bookRepository.searchBooks(any(), any(), any(), any(), any())).thenReturn(emptyPage);
        when(bookRepository.filterBooks(any(), any(), any(), any())).thenReturn(emptyPage);
    }

    @Test
    void searchBooks_withQueryAndNoSort_defaultsToRelevance() {
        Pageable pageable = PageRequest.of(0, 10);
        bookService.searchBooks("Harry Potter", null, null, pageable);

        ArgumentCaptor<String> sortCaptor = ArgumentCaptor.forClass(String.class);
        verify(bookRepository).searchBooks(eq("Harry Potter"), eq(null), eq(null), sortCaptor.capture(), any());
        assertThat(sortCaptor.getValue()).isEqualTo("relevance");
    }

    @Test
    void searchBooks_withoutQueryAndNoSort_defaultsToTitleAsc() {
        Pageable pageable = PageRequest.of(0, 10);
        bookService.searchBooks(null, null, null, pageable);

        ArgumentCaptor<String> sortCaptor = ArgumentCaptor.forClass(String.class);
        verify(bookRepository).filterBooks(eq(null), eq(null), sortCaptor.capture(), any());
        assertThat(sortCaptor.getValue()).isEqualTo("title_asc");
    }

    @Test
    void searchBooks_withAlphabeticalSort() {
        // A to Z
        Pageable pageableAsc = PageRequest.of(0, 10, Sort.by(Sort.Direction.ASC, "title"));
        bookService.searchBooks(null, null, null, pageableAsc);

        ArgumentCaptor<String> sortCaptor = ArgumentCaptor.forClass(String.class);
        verify(bookRepository).filterBooks(eq(null), eq(null), sortCaptor.capture(), any());
        assertThat(sortCaptor.getValue()).isEqualTo("title_asc");

        // Z to A
        Pageable pageableDesc = PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "title"));
        bookService.searchBooks(null, null, null, pageableDesc);

        verify(bookRepository, times(2)).filterBooks(eq(null), eq(null), sortCaptor.capture(), any());
        assertThat(sortCaptor.getValue()).isEqualTo("title_desc");
    }

    @Test
    void searchBooks_withRatingSort() {
        Pageable pageable = PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "ratingAvg"));
        bookService.searchBooks(null, null, null, pageable);

        ArgumentCaptor<String> sortCaptor = ArgumentCaptor.forClass(String.class);
        verify(bookRepository).filterBooks(eq(null), eq(null), sortCaptor.capture(), any());
        assertThat(sortCaptor.getValue()).isEqualTo("rating_desc");
    }

    @Test
    void searchBooks_withRatingCountSort() {
        Pageable pageable = PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "ratingCount"));
        bookService.searchBooks(null, null, null, pageable);

        ArgumentCaptor<String> sortCaptor = ArgumentCaptor.forClass(String.class);
        verify(bookRepository).filterBooks(eq(null), eq(null), sortCaptor.capture(), any());
        assertThat(sortCaptor.getValue()).isEqualTo("rating_count_desc");
    }

    @Test
    void searchBooks_withPublishedYearSort() {
        // Newest first
        Pageable pageableDesc = PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "publishedYear"));
        bookService.searchBooks(null, null, null, pageableDesc);

        ArgumentCaptor<String> sortCaptor = ArgumentCaptor.forClass(String.class);
        verify(bookRepository).filterBooks(eq(null), eq(null), sortCaptor.capture(), any());
        assertThat(sortCaptor.getValue()).isEqualTo("year_desc");

        // Oldest first
        Pageable pageableAsc = PageRequest.of(0, 10, Sort.by(Sort.Direction.ASC, "publishedYear"));
        bookService.searchBooks(null, null, null, pageableAsc);

        verify(bookRepository, times(2)).filterBooks(eq(null), eq(null), sortCaptor.capture(), any());
        assertThat(sortCaptor.getValue()).isEqualTo("year_asc");
    }
}
