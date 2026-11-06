package com.soa.gr6.lms.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.soa.gr6.lms.domain.enums.ReviewStatus;
import com.soa.gr6.lms.exception.InvalidDomainStateException;

class BookReviewDomainTest {

    private Book book;
    private User user;

    @BeforeEach
    void setUp() {
        book = new Book("Clean Code");
        user = new User("sub123", "reader@test.com", "John Doe");
    }

    @Test
    void createReviewWithValidRatingAndComment() {
        BookReview review = new BookReview(book, user, 5, "This book is great and very helpful!");
        assertThat(review.getRating()).isEqualTo(5);
        assertThat(review.getComment()).isEqualTo("This book is great and very helpful!");
        assertThat(review.getStatus()).isEqualTo(ReviewStatus.VISIBLE);
        assertThat(review.getBook()).isEqualTo(book);
        assertThat(review.getUser()).isEqualTo(user);
        assertThat(review.getCreatedAt()).isNotNull();
        assertThat(review.getUpdatedAt()).isNotNull();
    }

    @Test
    void createReviewWithoutCommentAllowed() {
        BookReview review = new BookReview(book, user, 4, null);
        assertThat(review.getRating()).isEqualTo(4);
        assertThat(review.getComment()).isNull();
        assertThat(review.getStatus()).isEqualTo(ReviewStatus.VISIBLE);
    }

    @Test
    void ratingOutOfRangeIsRejected() {
        assertThatThrownBy(() -> new BookReview(book, user, 0, "Valid comment text here"))
                .isInstanceOf(InvalidDomainStateException.class)
                .hasMessageContaining("Rating must be between 1 and 5");

        assertThatThrownBy(() -> new BookReview(book, user, 6, "Valid comment text here"))
                .isInstanceOf(InvalidDomainStateException.class)
                .hasMessageContaining("Rating must be between 1 and 5");
    }

    @Test
    void commentTooShortIsRejected() {
        assertThatThrownBy(() -> new BookReview(book, user, 4, "Too short"))
                .isInstanceOf(InvalidDomainStateException.class)
                .hasMessageContaining("between 10 and 1000");
    }

    @Test
    void commentTooLongIsRejected() {
        String longComment = "a".repeat(1001);
        assertThatThrownBy(() -> new BookReview(book, user, 4, longComment))
                .isInstanceOf(InvalidDomainStateException.class)
                .hasMessageContaining("between 10 and 1000");
    }

    @Test
    void updateModifiesFieldsAndValidates() {
        BookReview review = new BookReview(book, user, 4, "This book is quite good indeed!");
        review.update(5, "Now I think this is an excellent masterpiece!");
        assertThat(review.getRating()).isEqualTo(5);
        assertThat(review.getComment()).isEqualTo("Now I think this is an excellent masterpiece!");

        assertThatThrownBy(() -> review.update(10, "Valid comment"))
                .isInstanceOf(InvalidDomainStateException.class);
    }

    @Test
    void updateFailsWhenReviewIsHiddenOrDeleted() {
        BookReview review = new BookReview(book, user, 4, "Great book to learn from!");
        review.hideByAdmin();
        assertThat(review.getStatus()).isEqualTo(ReviewStatus.HIDDEN_BY_ADMIN);

        assertThatThrownBy(() -> review.update(5, "New comment here!"))
                .isInstanceOf(InvalidDomainStateException.class)
                .hasMessageContaining("cannot update an inactive or hidden review");
    }

    @Test
    void deleteByUserChangesStatus() {
        BookReview review = new BookReview(book, user, 4, "Great book to learn from!");
        review.deleteByUser();
        assertThat(review.getStatus()).isEqualTo(ReviewStatus.DELETED);
    }
}

