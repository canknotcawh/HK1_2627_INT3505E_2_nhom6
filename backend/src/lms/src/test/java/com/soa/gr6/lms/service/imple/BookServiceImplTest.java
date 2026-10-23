package com.soa.gr6.lms.service.imple;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import com.soa.gr6.lms.domain.Book;
import com.soa.gr6.lms.domain.enums.BookStatus;
import com.soa.gr6.lms.dto.BookRequest;
import com.soa.gr6.lms.exception.BookNotFoundException;
import com.soa.gr6.lms.exception.DuplicateResourceException;
import com.soa.gr6.lms.mapper.BookMapper;
import com.soa.gr6.lms.repository.BookRepository;

class BookServiceImplTest {
    private final BookRepository repository = mock(BookRepository.class);
    private final BookServiceImpl service = new BookServiceImpl(repository, new BookMapper());
    private final Pageable page = PageRequest.of(0, 10);

    private static BookRequest request(String isbn, int copies) {
        return new BookRequest(isbn, "Clean Code", null, null, "en", 2008, 464, null, copies);
    }

    private Book existing(UUID id) {
        Book book = new Book(id, "Old");
        book.updateCopyCounts(3, 3);
        return book;
    }

    @Test
    void getBookReturnsMappedBook() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.of(existing(id)));
        assertThat(service.getBook(id).title()).isEqualTo("Old");
    }

    @Test
    void getBookThrowsWhenMissing() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getBook(id)).isInstanceOf(BookNotFoundException.class);
    }

    @Test
    void searchWithoutKeywordListsAllActive() {
        when(repository.findByStatus(BookStatus.ACTIVE, page)).thenReturn(new PageImpl<>(List.of(new Book("A"))));
        assertThat(service.searchBooks("  ", page).getContent()).hasSize(1);
        assertThat(service.searchBooks(null, page).getContent()).hasSize(1);
    }

    @Test
    void searchWithKeywordTrimsIt() {
        when(repository.findByStatusAndTitleContainingIgnoreCase(BookStatus.ACTIVE, "clean", page))
                .thenReturn(new PageImpl<>(List.of(new Book("Clean Code"))));
        assertThat(service.searchBooks(" clean ", page).getContent()).hasSize(1);
    }

    @Test
    void createBookStartsWithAllCopiesAvailable() {
        when(repository.findByIsbn13("9780132350884")).thenReturn(Optional.empty());
        when(repository.save(any(Book.class))).thenAnswer(i -> i.getArgument(0));
        var response = service.createBook(request("9780132350884", 4));
        assertThat(response.totalCopies()).isEqualTo(4);
        assertThat(response.availableCopies()).isEqualTo(4);
    }

    @Test
    void createBookRejectsDuplicateIsbn() {
        when(repository.findByIsbn13("9780132350884")).thenReturn(Optional.of(existing(UUID.randomUUID())));
        assertThatThrownBy(() -> service.createBook(request("9780132350884", 1)))
                .isInstanceOf(DuplicateResourceException.class);
    }

    @Test
    void createBookWithoutIsbnSkipsUniquenessCheck() {
        when(repository.save(any(Book.class))).thenAnswer(i -> i.getArgument(0));
        assertThat(service.createBook(request(null, 1)).isbn13()).isNull();
    }

    @Test
    void updateBookAllowsOwnIsbnButNotSomeoneElses() {
        UUID id = UUID.randomUUID();
        Book own = existing(id);
        when(repository.findById(id)).thenReturn(Optional.of(own));
        when(repository.findByIsbn13("9780132350884")).thenReturn(Optional.of(own));
        assertThat(service.updateBook(id, request("9780132350884", 3)).title()).isEqualTo("Clean Code");

        when(repository.findByIsbn13("9780132350884")).thenReturn(Optional.of(existing(UUID.randomUUID())));
        assertThatThrownBy(() -> service.updateBook(id, request("9780132350884", 3)))
                .isInstanceOf(DuplicateResourceException.class);
    }

    @Test
    void updateCopyCountsUsesRowLock() {
        UUID id = UUID.randomUUID();
        when(repository.findByIdForUpdate(id)).thenReturn(Optional.of(existing(id)));
        assertThat(service.updateCopyCounts(id, 5, 2).availableCopies()).isEqualTo(2);

        when(repository.findByIdForUpdate(id)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.updateCopyCounts(id, 5, 2)).isInstanceOf(BookNotFoundException.class);
    }

    @Test
    void retireAndActivate() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.of(existing(id)));
        assertThat(service.retireBook(id).status()).isEqualTo("RETIRED");
        assertThat(service.activateBook(id).status()).isEqualTo("ACTIVE");
    }
}
