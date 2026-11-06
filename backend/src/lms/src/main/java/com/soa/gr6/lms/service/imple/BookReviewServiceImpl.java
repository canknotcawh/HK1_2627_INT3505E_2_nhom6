package com.soa.gr6.lms.service.imple;

import com.soa.gr6.lms.domain.Book;
import com.soa.gr6.lms.domain.BookReview;
import com.soa.gr6.lms.domain.User;
import com.soa.gr6.lms.domain.enums.LoanStatus;
import com.soa.gr6.lms.domain.enums.ReviewStatus;
import com.soa.gr6.lms.dto.ReviewEligibilityResponse;
import com.soa.gr6.lms.dto.ReviewRequest;
import com.soa.gr6.lms.dto.ReviewResponse;
import com.soa.gr6.lms.dto.ReviewStatsResponse;
import com.soa.gr6.lms.exception.ApiException;
import com.soa.gr6.lms.exception.BookNotFoundException;
import com.soa.gr6.lms.exception.DuplicateResourceException;
import com.soa.gr6.lms.exception.ErrorCode;
import com.soa.gr6.lms.exception.ReviewNotEligibleException;
import com.soa.gr6.lms.exception.ReviewNotFoundException;
import com.soa.gr6.lms.exception.ReviewPermissionDeniedException;
import com.soa.gr6.lms.mapper.BookReviewMapper;
import com.soa.gr6.lms.repository.BookRepository;
import com.soa.gr6.lms.repository.BookReviewRepository;
import com.soa.gr6.lms.repository.LoanRepository;
import com.soa.gr6.lms.repository.UserRepository;
import com.soa.gr6.lms.service.BookReviewService;
import com.soa.gr6.lms.service.support.PageableSupport;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class BookReviewServiceImpl implements BookReviewService {

    private static final int MAX_PAGE_SIZE = 50;

    private final BookReviewRepository bookReviewRepository;
    private final BookRepository bookRepository;
    private final UserRepository userRepository;
    private final LoanRepository loanRepository;
    private final BookReviewMapper bookReviewMapper;

    public BookReviewServiceImpl(
            BookReviewRepository bookReviewRepository,
            BookRepository bookRepository,
            UserRepository userRepository,
            LoanRepository loanRepository,
            BookReviewMapper bookReviewMapper) {
        this.bookReviewRepository = bookReviewRepository;
        this.bookRepository = bookRepository;
        this.userRepository = userRepository;
        this.loanRepository = loanRepository;
        this.bookReviewMapper = bookReviewMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public ReviewEligibilityResponse checkEligibility(UUID userId, UUID bookId) {
        if (!bookRepository.existsById(bookId)) {
            throw new BookNotFoundException(bookId);
        }
        if (bookReviewRepository.existsByBookIdAndUserId(bookId, userId)) {
            return ReviewEligibilityResponse.ofAlreadyReviewed();
        }
        boolean hasReturned = loanRepository.existsByUserIdAndBookIdAndStatusIn(
                userId, bookId, List.of(LoanStatus.RETURNED));
        if (!hasReturned) {
            return ReviewEligibilityResponse.ofNotBorrowed();
        }
        return ReviewEligibilityResponse.ofEligible();
    }

    @Override
    @Transactional
    public ReviewResponse createReview(UUID userId, UUID bookId, ReviewRequest request) {
        ReviewEligibilityResponse eligibility = checkEligibility(userId, bookId);
        if (eligibility.alreadyReviewed()) {
            throw new DuplicateResourceException("REVIEW_ALREADY_EXISTS", "You have already reviewed this book");
        }
        if (!eligibility.eligible()) {
            throw new ReviewNotEligibleException(eligibility.reason());
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new BookNotFoundException(bookId));

        BookReview review = new BookReview(book, user, request.rating(), request.comment());
        review = bookReviewRepository.save(review);

        updateBookRatingMetrics(book);

        return bookReviewMapper.toResponse(review);
    }

    @Override
    @Transactional
    public ReviewResponse updateReview(UUID userId, UUID reviewId, ReviewRequest request) {
        BookReview review = findReview(reviewId);
        if (!review.getUser().getId().equals(userId)) {
            throw new ReviewPermissionDeniedException();
        }

        review.update(request.rating(), request.comment());
        review = bookReviewRepository.save(review);

        updateBookRatingMetrics(review.getBook());

        return bookReviewMapper.toResponse(review);
    }

    @Override
    @Transactional
    public void deleteReviewByUser(UUID userId, UUID reviewId) {
        BookReview review = findReview(reviewId);
        if (!review.getUser().getId().equals(userId)) {
            throw new ReviewPermissionDeniedException();
        }

        Book book = review.getBook();
        bookReviewRepository.delete(review);

        updateBookRatingMetrics(book);
    }

    @Override
    @Transactional
    public void hideReviewByAdmin(UUID reviewId) {
        BookReview review = findReview(reviewId);
        review.hideByAdmin();
        bookReviewRepository.save(review);

        updateBookRatingMetrics(review.getBook());
    }

    @Override
    @Transactional
    public void deleteReviewByAdmin(UUID reviewId) {
        BookReview review = findReview(reviewId);
        Book book = review.getBook();
        bookReviewRepository.delete(review);

        updateBookRatingMetrics(book);
    }

    @Override
    @Transactional(readOnly = true)
    public ReviewResponse getReview(UUID reviewId) {
        return bookReviewMapper.toResponse(findReview(reviewId));
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ReviewResponse> getUserReviewForBook(UUID userId, UUID bookId) {
        return bookReviewRepository.findByBookIdAndUserId(bookId, userId)
                .map(bookReviewMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ReviewResponse> listBookReviews(UUID bookId, Pageable pageable) {
        if (!bookRepository.existsById(bookId)) {
            throw new BookNotFoundException(bookId);
        }
        Pageable clamped = PageableSupport.clamp(pageable, MAX_PAGE_SIZE);
        return bookReviewRepository.findByBookIdAndStatus(bookId, ReviewStatus.VISIBLE, clamped)
                .map(bookReviewMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ReviewResponse> listAllReviewsForAdmin(Pageable pageable) {
        Pageable clamped = PageableSupport.clamp(pageable, MAX_PAGE_SIZE);
        return bookReviewRepository.findAll(clamped).map(bookReviewMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public ReviewStatsResponse getBookReviewStats(UUID bookId) {
        if (!bookRepository.existsById(bookId)) {
            throw new BookNotFoundException(bookId);
        }
        Double avg = bookReviewRepository.findAverageRatingByBookIdAndStatus(bookId, ReviewStatus.VISIBLE);
        long count = bookReviewRepository.countByBookIdAndStatus(bookId, ReviewStatus.VISIBLE);
        BigDecimal ratingAvg = (avg == null || count == 0)
                ? BigDecimal.ZERO
                : BigDecimal.valueOf(avg).setScale(2, RoundingMode.HALF_UP);

        Map<Integer, Long> distribution = new LinkedHashMap<>();
        for (int i = 5; i >= 1; i--) {
            distribution.put(i, 0L);
        }
        List<Object[]> rows = bookReviewRepository.countRatingDistributionByBookIdAndStatus(bookId, ReviewStatus.VISIBLE);
        for (Object[] row : rows) {
            Integer rating = ((Number) row[0]).intValue();
            Long c = ((Number) row[1]).longValue();
            distribution.put(rating, c);
        }

        return new ReviewStatsResponse(ratingAvg, count, distribution);
    }

    private BookReview findReview(UUID reviewId) {
        return bookReviewRepository.findById(reviewId)
                .orElseThrow(() -> new ReviewNotFoundException(reviewId));
    }

    private void updateBookRatingMetrics(Book book) {
        Double avg = bookReviewRepository.findAverageRatingByBookIdAndStatus(book.getId(), ReviewStatus.VISIBLE);
        long count = bookReviewRepository.countByBookIdAndStatus(book.getId(), ReviewStatus.VISIBLE);
        BigDecimal ratingAvg = (avg == null || count == 0)
                ? BigDecimal.ZERO
                : BigDecimal.valueOf(avg).setScale(2, RoundingMode.HALF_UP);
        book.updateRating(ratingAvg, (int) count);
        bookRepository.save(book);
    }
}