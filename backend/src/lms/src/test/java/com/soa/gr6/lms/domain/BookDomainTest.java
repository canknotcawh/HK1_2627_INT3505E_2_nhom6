package com.soa.gr6.lms.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Year;

import org.junit.jupiter.api.Test;

import com.soa.gr6.lms.domain.enums.BookStatus;
import com.soa.gr6.lms.exception.BookUnavailableException;
import com.soa.gr6.lms.exception.InvalidDomainStateException;

class BookDomainTest {

    private static Book book(int total, int available) {
        Book book = new Book("Clean Code");
        book.updateCopyCounts(total, available);
        return book;
    }

    @Test
    void blankTitleIsRejected() {
        assertThatThrownBy(() -> new Book(" ")).isInstanceOf(InvalidDomainStateException.class);
        assertThatThrownBy(() -> new Book(null)).isInstanceOf(InvalidDomainStateException.class);
    }

    @Test
    void metadataIsApplied() {
        Book book = new Book("old");
        book.updateMetadata("9780132350884", "Clean Code", "gg1234567890", "desc", "en", 2008, 464, "c");
        assertThat(book.getIsbn13()).isEqualTo("9780132350884");
        assertThat(book.getTitle()).isEqualTo("Clean Code");
        assertThat(book.getGgId()).isEqualTo("gg1234567890");
    }

    @Test
    void metadataCanBeCleared() {
        Book book = new Book("t");
        book.updateMetadata(null, "t2", null, null, null, null, null, null);
        assertThat(book.getTitle()).isEqualTo("t2");
        assertThat(book.getIsbn13()).isNull();
        assertThat(book.getGgId()).isNull();
    }

    @Test
    void invalidMetadataIsRejected() {
        Book book = new Book("t");
        assertThatThrownBy(() -> book.updateMetadata("123", "t", null, null, null, null, null, null))
                .hasMessageContaining("13 digits");
        assertThatThrownBy(() -> book.updateMetadata(null, "t", null, null, "x".repeat(11), null, null, null))
                .hasMessageContaining("language");
        assertThatThrownBy(() -> book.updateMetadata(null, "t", null, null, null, 999, null, null))
                .hasMessageContaining("publishedYear");
        assertThatThrownBy(() -> book.updateMetadata(null, "t", null, null, null, Year.now().getValue() + 2, null, null))
                .hasMessageContaining("publishedYear");
        assertThatThrownBy(() -> book.updateMetadata(null, "t", null, null, null, null, -1, null))
                .hasMessageContaining("pageCount");
        assertThatThrownBy(() -> book.updateMetadata(null, " ", null, null, null, null, null, null))
                .hasMessageContaining("title");
    }

    @Test
    void copyCountsMustBeConsistent() {
        Book book = new Book("t");
        assertThatThrownBy(() -> book.updateCopyCounts(1, 2)).isInstanceOf(InvalidDomainStateException.class);
        assertThatThrownBy(() -> book.updateCopyCounts(-1, 0)).isInstanceOf(InvalidDomainStateException.class);
        assertThatThrownBy(() -> book.updateCopyCounts(1, -1)).isInstanceOf(InvalidDomainStateException.class);
    }

    @Test
    void borrowAndReturnCopy() {
        Book book = book(2, 2);
        book.borrowCopy();
        assertThat(book.getAvailableCopies()).isEqualTo(1);
        book.returnCopy();
        assertThat(book.getAvailableCopies()).isEqualTo(2);
        assertThatThrownBy(book::returnCopy).isInstanceOf(InvalidDomainStateException.class);
    }

    @Test
    void cannotBorrowWhenEmptyOrRetired() {
        Book empty = book(1, 0);
        assertThatThrownBy(empty::borrowCopy).isInstanceOf(BookUnavailableException.class);

        Book retired = book(1, 1);
        retired.retire();
        assertThat(retired.getStatus()).isEqualTo(BookStatus.RETIRED);
        assertThatThrownBy(retired::borrowCopy).isInstanceOf(BookUnavailableException.class);
        retired.activate();
        assertThat(retired.getStatus()).isEqualTo(BookStatus.ACTIVE);
    }

    @Test
    void lostCopyIsWrittenOffAndCanBeRecovered() {
        Book book = book(2, 1);
        book.writeOffLostCopy();
        assertThat(book.getTotalCopies()).isEqualTo(1);
        book.recoverLostCopy();
        assertThat(book.getTotalCopies()).isEqualTo(2);
        assertThat(book.getAvailableCopies()).isEqualTo(2);

        Book allHome = book(1, 1);
        assertThatThrownBy(allHome::writeOffLostCopy).isInstanceOf(InvalidDomainStateException.class);
    }
}
