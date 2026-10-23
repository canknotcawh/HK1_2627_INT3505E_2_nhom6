package com.soa.gr6.lms.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.junit.jupiter.api.Test;

import com.soa.gr6.lms.domain.Book;
import com.soa.gr6.lms.domain.Loan;
import com.soa.gr6.lms.domain.User;
import com.soa.gr6.lms.domain.enums.UserRole;
import com.soa.gr6.lms.dto.AdminUserResponse;
import com.soa.gr6.lms.dto.UserResponse;

class MapperAndDtoTest {

    @Test
    void bookMapperCopiesAllFields() {
        Book book = new Book("t");
        book.updateMetadata("9780132350884", "Clean Code", "gg123", "d", "en", 2008, 464, "c");
        book.updateCopyCounts(3, 2);
        var dto = new BookMapper().toResponse(book);
        assertThat(dto.isbn13()).isEqualTo("9780132350884");
        assertThat(dto.totalCopies()).isEqualTo(3);
        assertThat(dto.availableCopies()).isEqualTo(2);
        assertThat(dto.status()).isEqualTo("ACTIVE");
        assertThat(dto.ggId()).isEqualTo("gg123");
    }

    @Test
    void loanMapperExposesBookTitleAndUser() {
        Book book = new Book("Clean Code");
        book.updateCopyCounts(1, 1);
        Loan loan = new Loan(book, new User("s", "a@b.com", "A"), Instant.now().plus(14, ChronoUnit.DAYS));
        var dto = new LoanMapper().toResponse(loan);
        assertThat(dto.bookTitle()).isEqualTo("Clean Code");
        assertThat(dto.status()).isEqualTo("ACTIVE");
        assertThat(dto.renewedCount()).isZero();
    }

    @Test
    void userDtos() {
        User user = new User("s", "a@b.com", "A B");
        assertThat(UserResponse.from(user).role()).isEqualTo(UserRole.USER);
        assertThat(AdminUserResponse.from(user).email()).isEqualTo("a@b.com");
    }
}
