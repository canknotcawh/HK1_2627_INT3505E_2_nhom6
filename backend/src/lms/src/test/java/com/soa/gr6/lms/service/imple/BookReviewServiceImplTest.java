package com.soa.gr6.lms.service.imple;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import com.soa.gr6.lms.domain.Book;
import com.soa.gr6.lms.domain.BookReview;
import com.soa.gr6.lms.domain.User;
import com.soa.gr6.lms.domain.enums.LoanStatus;
import com.soa.gr6.lms.domain.enums.ReviewStatus;
import com.soa.gr6.lms.dto.ReviewEligibilityResponse;
import com.soa.gr6.lms.dto.ReviewRequest;
import com.soa.gr6.lms.dto.ReviewResponse;
import com.soa.gr6.lms.dto.ReviewStatsResponse;
import com.soa.gr6.lms.exception.BookNotFoundException;
import com.soa.gr6.lms.exception.DuplicateResourceException;
import com.soa.gr6.lms.exception.ReviewNotEligibleException;
import com.soa.gr6.lms.exception.ReviewPermissionDeniedException;
import com.soa.gr6.lms.mapper.BookReviewMapper;
import com.soa.gr6.lms.repository.BookRepository;
import com.soa.gr6.lms.repository.BookReviewRepository;
import com.soa.gr6.lms.repository.LoanRepository;
import com.soa.gr6.lms.repository.UserRepository;

class BookReviewServiceImplTest {

    private final BookReviewRepository bookReviewRepository = mock(BookReviewRepository.class);
    private final BookRepository bookRepository = mock(BookRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final LoanRepository loanRepository = mock(LoanRepository.class);
    private final BookReviewMapper mapper = new BookReviewMapper();

    private final BookReviewServiceImpl service = new BookReviewServiceImpl(
            bookReviewRepository, bookRepository, userRepository, loanRepository, mapper);

    private final UUID userId = UUID.randomUUID();
    private final UUID otherUserId = UUID.randomUUID();
    private final UUID bookId = UUID.randomUUID();
    private final UUID reviewId = UUID.randomUUID();

    private Book book;
    private User user;
    private User otherUser;

    @BeforeEach
    void setUp() throws Exception {
        book = new Book("Effective Java");
        setField(book, "id", bookId);

        user = new User("sub1", "user@test.com", "Alice Reader");
        setField(user, "id", userId);

        otherUser = new User("sub2", "other@test.com", "Bob Reader");
        setField(otherUser, "id", otherUserId);

        when(bookRepository.existsById(bookId)).thenReturn(true);
        when(bookRepository.findById(bookId)).thenReturn(Optional.of(book));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.findById(otherUserId)).thenReturn(Optional.of(otherUser));
        when(bookReviewRepository.save(any(BookReview.class))).thenAnswer(i -> i.getArgument(0));
    }

    private static void setField(Object target, String name, Object value) throws Exception {
        Field f = target.getClass().getDeclaredField(name);
        f.setAccessible(true);
        f.set(target, value);
    }

    @Test
    void checkEligibilityReturnsNotBorrowedWhenNoReturnedLoans() {
        when(bookReviewRepository.existsByBookIdAndUserId(bookId, userId)).thenReturn(false);
        when(loanRepository.existsByUserIdAndBookIdAndStatusIn(userId, bookId, List.of(LoanStatus.RETURNED)))
                .thenReturn(false);

        ReviewEligibilityResponse response = service.checkEligibility(userId, bookId);
        assertThat(response.eligible()).isFalse();
        assertThat(response.alreadyReviewed()).isFalse();
        assertThat(response.reason()).contains("must borrow and return");
    }

    @Test
    void checkEligibilityReturnsAlreadyReviewedWhenReviewExists() {
        when(bookReviewRepository.existsByBookIdAndUserId(bookId, userId)).thenReturn(true);

        ReviewEligibilityResponse response = service.checkEligibility(userId, bookId);
        assertThat(response.eligible()).isFalse();
        assertThat(response.alreadyReviewed()).isTrue();
    }

    @Test
    void checkEligibilityReturnsEligibleWhenReturnedAndNotYetReviewed() {
        when(bookReviewRepository.existsByBookIdAndUserId(bookId, userId)).thenReturn(false);
        when(loanRepository.existsByUserIdAndBookIdAndStatusIn(userId, bookId, List.of(LoanStatus.RETURNED)))
                .thenReturn(true);

        ReviewEligibilityResponse response = service.checkEligibility(userId, bookId);
        assertThat(response.eligible()).isTrue();
        assertThat(response.alreadyReviewed()).isFalse();
        assertThat(response.reason()).isNull();
    }

    @Test
    void createReviewThrowsWhenNotEligible() {
        when(bookReviewRepository.existsByBookIdAndUserId(bookId, userId)).thenReturn(false);
        when(loanRepository.existsByUserIdAndBookIdAndStatusIn(userId, bookId, List.of(LoanStatus.RETURNED)))
                .thenReturn(false);

        ReviewRequest request = new ReviewRequest(5, "Excellent book on Java patterns!");
        assertThatThrownBy(() -> service.createReview(userId, bookId, request))
                .isInstanceOf(ReviewNotEligibleException.class);
    }

    @Test
    void createReviewThrowsWhenAlreadyReviewed() {
        when(bookReviewRepository.existsByBookIdAndUserId(bookId, userId)).thenReturn(true);

        ReviewRequest request = new ReviewRequest(5, "Excellent book on Java patterns!");
        assertThatThrownBy(() -> service.createReview(userId, bookId, request))
                .isInstanceOf(DuplicateResourceException.class);
    }

    @Test
    void createReviewSuccessAndUpdatesBookRating() {
        when(bookReviewRepository.existsByBookIdAndUserId(bookId, userId)).thenReturn(false);
        when(loanRepository.existsByUserIdAndBookIdAndStatusIn(userId, bookId, List.of(LoanStatus.RETURNED)))
                .thenReturn(true);
        when(bookReviewRepository.findAverageRatingByBookIdAndStatus(bookId, ReviewStatus.VISIBLE))
                .thenReturn(4.5);
        when(bookReviewRepository.countByBookIdAndStatus(bookId, ReviewStatus.VISIBLE))
                .thenReturn(2L);

        ReviewRequest request = new ReviewRequest(5, "Excellent book on Java patterns!");
        ReviewResponse response = service.createReview(userId, bookId, request);

        assertThat(response.rating()).isEqualTo(5);
        assertThat(response.comment()).isEqualTo("Excellent book on Java patterns!");
        assertThat(response.userName()).isEqualTo("Alice Reader");
        assertThat(book.getRatingAvg()).isEqualTo(new BigDecimal("4.50"));
        assertThat(book.getRatingCount()).isEqualTo(2);
        verify(bookRepository).save(book);
    }

    @Test
    void updateReviewThrowsWhenUserNotOwner() throws Exception {
        BookReview review = new BookReview(book, user, 4, "Initial review comment");
        setField(review, "id", reviewId);
        when(bookReviewRepository.findById(reviewId)).thenReturn(Optional.of(review));

        ReviewRequest request = new ReviewRequest(5, "Trying to edit other's review");
        assertThatThrownBy(() -> service.updateReview(otherUserId, reviewId, request))
                .isInstanceOf(ReviewPermissionDeniedException.class);
    }

    @Test
    void updateReviewSuccessUpdatesFieldsAndMetrics() throws Exception {
        BookReview review = new BookReview(book, user, 4, "Initial review comment");
        setField(review, "id", reviewId);
        when(bookReviewRepository.findById(reviewId)).thenReturn(Optional.of(review));
        when(bookReviewRepository.findAverageRatingByBookIdAndStatus(bookId, ReviewStatus.VISIBLE))
                .thenReturn(5.0);
        when(bookReviewRepository.countByBookIdAndStatus(bookId, ReviewStatus.VISIBLE))
                .thenReturn(1L);

        ReviewRequest request = new ReviewRequest(5, "Updated to 5 stars after reading more!");
        ReviewResponse response = service.updateReview(userId, reviewId, request);

        assertThat(response.rating()).isEqualTo(5);
        assertThat(response.comment()).isEqualTo("Updated to 5 stars after reading more!");
        assertThat(book.getRatingAvg()).isEqualTo(new BigDecimal("5.00"));
        verify(bookRepository).save(book);
    }

    @Test
    void deleteReviewByUserThrowsWhenNotOwner() throws Exception {
        BookReview review = new BookReview(book, user, 4, "Initial review comment");
        setField(review, "id", reviewId);
        when(bookReviewRepository.findById(reviewId)).thenReturn(Optional.of(review));

        assertThatThrownBy(() -> service.deleteReviewByUser(otherUserId, reviewId))
                .isInstanceOf(ReviewPermissionDeniedException.class);
    }

    @Test
    void deleteReviewByUserSuccessDeletesAndRecalculates() throws Exception {
        BookReview review = new BookReview(book, user, 4, "Initial review comment");
        setField(review, "id", reviewId);
        when(bookReviewRepository.findById(reviewId)).thenReturn(Optional.of(review));
        when(bookReviewRepository.findAverageRatingByBookIdAndStatus(bookId, ReviewStatus.VISIBLE))
                .thenReturn(null);
        when(bookReviewRepository.countByBookIdAndStatus(bookId, ReviewStatus.VISIBLE))
                .thenReturn(0L);

        service.deleteReviewByUser(userId, reviewId);

        verify(bookReviewRepository).delete(review);
        assertThat(book.getRatingAvg()).isEqualTo(BigDecimal.ZERO);
        assertThat(book.getRatingCount()).isEqualTo(0);
        verify(bookRepository).save(book);
    }

    @Test
    void hideReviewByAdminChangesStatusAndRecalculatesMetrics() throws Exception {
        BookReview review = new BookReview(book, user, 1, "Rude bad words violating policy!");
        setField(review, "id", reviewId);
        when(bookReviewRepository.findById(reviewId)).thenReturn(Optional.of(review));
        when(bookReviewRepository.findAverageRatingByBookIdAndStatus(bookId, ReviewStatus.VISIBLE))
                .thenReturn(5.0);
        when(bookReviewRepository.countByBookIdAndStatus(bookId, ReviewStatus.VISIBLE))
                .thenReturn(1L);

        service.hideReviewByAdmin(reviewId);

        assertThat(review.getStatus()).isEqualTo(ReviewStatus.HIDDEN_BY_ADMIN);
        assertThat(book.getRatingAvg()).isEqualTo(new BigDecimal("5.00"));
        verify(bookRepository).save(book);
    }

    @Test
    void restoreReviewByAdminRestoresStatusAndRecalculatesMetrics() throws Exception {
        BookReview review = new BookReview(book, user, 5, "Legitimate review falsely reported!");
        setField(review, "id", reviewId);
        review.hideByAdmin();
        when(bookReviewRepository.findById(reviewId)).thenReturn(Optional.of(review));
        when(bookReviewRepository.findAverageRatingByBookIdAndStatus(bookId, ReviewStatus.VISIBLE))
                .thenReturn(4.8);
        when(bookReviewRepository.countByBookIdAndStatus(bookId, ReviewStatus.VISIBLE))
                .thenReturn(5L);

        service.restoreReviewByAdmin(reviewId);

        assertThat(review.getStatus()).isEqualTo(ReviewStatus.VISIBLE);
        assertThat(book.getRatingAvg()).isEqualTo(new BigDecimal("4.80"));
        verify(bookRepository).save(book);
    }

    @Test
    void getBookReviewStatsReturnsDistribution() {
        when(bookReviewRepository.findAverageRatingByBookIdAndStatus(bookId, ReviewStatus.VISIBLE))
                .thenReturn(4.67);
        when(bookReviewRepository.countByBookIdAndStatus(bookId, ReviewStatus.VISIBLE))
                .thenReturn(3L);

        List<Object[]> distributionRows = List.of(
                new Object[]{5, 2L},
                new Object[]{4, 1L}
        );
        when(bookReviewRepository.countRatingDistributionByBookIdAndStatus(bookId, ReviewStatus.VISIBLE))
                .thenReturn(distributionRows);

        ReviewStatsResponse stats = service.getBookReviewStats(bookId);

        assertThat(stats.averageRating()).isEqualTo(new BigDecimal("4.67"));
        assertThat(stats.totalReviews()).isEqualTo(3L);
        assertThat(stats.ratingDistribution().get(5)).isEqualTo(2L);
        assertThat(stats.ratingDistribution().get(4)).isEqualTo(1L);
        assertThat(stats.ratingDistribution().get(3)).isEqualTo(0L);
    }
}

