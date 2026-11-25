package com.soa.gr6.lms.service.imple;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.io.ByteArrayInputStream;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.mock.env.MockEnvironment;

import com.soa.gr6.lms.domain.Book;
import com.soa.gr6.lms.domain.BookFile;
import com.soa.gr6.lms.domain.CanaryAccess;
import com.soa.gr6.lms.domain.CanaryToken;
import com.soa.gr6.lms.domain.Loan;
import com.soa.gr6.lms.domain.User;
import com.soa.gr6.lms.domain.enums.BookFileKind;
import com.soa.gr6.lms.domain.enums.BookFileStatus;
import com.soa.gr6.lms.domain.enums.CanaryOutcome;
import com.soa.gr6.lms.domain.enums.CanaryPurpose;
import com.soa.gr6.lms.domain.enums.CanaryRevokeReason;
import com.soa.gr6.lms.domain.enums.LoanStatus;
import com.soa.gr6.lms.dto.CanaryGroupRow;
import com.soa.gr6.lms.exception.ApiException;
import com.soa.gr6.lms.exception.ErrorCode;
import com.soa.gr6.lms.repository.BookFileRepository;
import com.soa.gr6.lms.repository.BookRepository;
import com.soa.gr6.lms.repository.CanaryAccessRepository;
import com.soa.gr6.lms.repository.CanaryTokenRepository;
import com.soa.gr6.lms.repository.LoanRepository;
import com.soa.gr6.lms.repository.UserRepository;
import com.soa.gr6.lms.service.CanaryTokenService;
import com.soa.gr6.lms.service.support.CanaryAccessLocationEnricher;
import com.soa.gr6.lms.service.support.IpGeolocationService;
import com.soa.gr6.lms.service.support.IpLocation;
import com.soa.gr6.lms.service.support.RateLimiter;
import com.soa.gr6.lms.storage.StorageService;

class CanaryTokenServiceImplTest {

    private final CanaryTokenRepository tokens = mock(CanaryTokenRepository.class);
    private final CanaryAccessRepository accesses = mock(CanaryAccessRepository.class);
    private final BookRepository books = mock(BookRepository.class);
    private final BookFileRepository files = mock(BookFileRepository.class);
    private final LoanRepository loans = mock(LoanRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final StorageService storage = mock(StorageService.class);
    private final IpGeolocationService geolocation = mock(IpGeolocationService.class);
    private final CanaryAccessLocationEnricher locationEnricher = mock(CanaryAccessLocationEnricher.class);

    private final UUID userId = UUID.randomUUID();
    private final UUID bookId = UUID.randomUUID();
    private final UUID loanId = UUID.randomUUID();

    private CanaryTokenServiceImpl service;
    private Book book;
    private User user;
    private BookFile fullFile;
    private Loan loan;

    @BeforeEach
    void setUp() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("dev");
        when(geolocation.resolve(any())).thenReturn(new IpLocation("1.2.3.4", "IPv4", "VN", "Vietnam",
                "Hanoi", "Hanoi", 21.03, 105.85, "Asia/Bangkok", "Viettel", IpLocation.SOURCE_GEOIP));
        service = new CanaryTokenServiceImpl(tokens, accesses, books, files, loans, users, storage, new RateLimiter(),
                geolocation, locationEnricher, environment, Duration.ofMinutes(30), Duration.ofMinutes(15), Duration.ofHours(12), "", 10, 120);

        book = new Book(bookId, "Clean Code");
        book.updateCopyCounts(2, 2);
        user = mock(User.class);
        when(user.getStatus()).thenReturn(com.soa.gr6.lms.domain.enums.UserStatus.ACTIVE);
        when(user.getEmail()).thenReturn("reader@example.com");
        when(user.getFullName()).thenReturn("Reader");
        when(user.getId()).thenReturn(userId);

        fullFile = new BookFile(UUID.randomUUID(), book, BookFileKind.FULL, "books/x/f.pdf", "Clean Code.pdf",
                "application/pdf", 460, "a".repeat(64), 1, null);
        loan = mock(Loan.class);
        when(loan.getId()).thenReturn(loanId);
        when(loan.getStatus()).thenReturn(LoanStatus.ACTIVE);

        when(users.findById(userId)).thenReturn(Optional.of(user));
        when(books.findById(bookId)).thenReturn(Optional.of(book));
        when(tokens.save(any(CanaryToken.class))).thenAnswer(call -> call.getArgument(0));
    }

    private void givenFullFile() {
        when(files.findByBookIdAndKindAndStatus(bookId, BookFileKind.FULL, BookFileStatus.ACTIVE))
                .thenReturn(Optional.of(fullFile));
    }

    private void givenOpenLoan() {
        when(loans.findFirstByUserIdAndBookIdAndStatusInOrderByBorrowedAtDesc(any(), any(), any()))
                .thenReturn(Optional.of(loan));
    }

    private CanaryTokenServiceImpl serviceWithLimits(int issueLimit, int streamLimit) {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("dev");
        return new CanaryTokenServiceImpl(tokens, accesses, books, files, loans, users, storage, new RateLimiter(),
                geolocation, locationEnricher, environment, Duration.ofMinutes(30), Duration.ofMinutes(15), Duration.ofHours(12), "",
                issueLimit, streamLimit);
    }

    private CanaryToken token(Instant expiresAt, CanaryPurpose purpose, Loan attachedLoan) {
        return new CanaryToken(UUID.randomUUID(), CanaryTokenServiceImpl.sha256("cnr_abcdefghijklmnopqrstuv"),
                "cnr_abcdef", book, fullFile, user, attachedLoan, purpose,
                Instant.now().minus(Duration.ofMinutes(1)), expiresAt, "1.2.3.4", null, null);
    }

    @Test
    void issueReturnsLinkWithTokenOnceForActiveLoan() {
        givenFullFile();
        givenOpenLoan();

        var response = service.issue(userId, bookId, CanaryPurpose.READ,
                new CanaryTokenService.ClientFingerprint("1.2.3.4", "JUnit"));

        assertThat(response.url()).startsWith("/api/v1/reader/files/cnr_");
        assertThat(response.url()).doesNotContain("1.2.3.4");
        assertThat(response.tokenSuffix()).hasSize(6);
        assertThat(response.watermarkText()).contains("reader@example.com").contains("CNR-");
        assertThat(response.expiresAt()).isAfter(Instant.now());
    }

    @Test
    void issueRejectsReadWithoutOpenLoan() {
        givenFullFile();
        when(loans.findFirstByUserIdAndBookIdAndStatusInOrderByBorrowedAtDesc(any(), any(), any()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.issue(userId, bookId, CanaryPurpose.READ, null))
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getErrorCode())
                .isEqualTo(ErrorCode.LOAN_REQUIRED);
    }

    @Test
    void issueRejectsReadWhenBookHasNoFullFile() {
        givenOpenLoan();
        when(files.findByBookIdAndKindAndStatus(bookId, BookFileKind.FULL, BookFileStatus.ACTIVE))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.issue(userId, bookId, CanaryPurpose.READ, null))
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getErrorCode())
                .isEqualTo(ErrorCode.BOOK_FILE_NOT_AVAILABLE);
    }

    @Test
    void openStreamsPdfAndRecordsAccess() {
        CanaryToken active = token(Instant.now().plus(Duration.ofMinutes(10)), CanaryPurpose.READ, loan);
        when(tokens.findByTokenHash(any())).thenReturn(Optional.of(active));
        when(storage.open("books/x/f.pdf")).thenReturn(new ByteArrayInputStream("%PDF".getBytes()));

        var payload = service.open("cnr_abcdefghijklmnopqrstuv",
                new CanaryTokenService.ClientFingerprint("1.2.3.4", "JUnit"), null, "req-1");

        assertThat(payload.totalSize()).isEqualTo(460);
        assertThat(payload.length()).isEqualTo(460);
        assertThat(payload.partial()).isFalse();
        assertThat(active.getAccessCount()).isEqualTo(1);
        assertThat(active.getLastSeenAt()).isNotNull();
    }

    @Test
    void openRecordsClientIpWithoutResolvingLocationInsideTheStreamTransaction() {
        CanaryToken active = token(Instant.now().plus(Duration.ofMinutes(10)), CanaryPurpose.READ, loan);
        when(tokens.findByTokenHash(any())).thenReturn(Optional.of(active));
        when(storage.open("books/x/f.pdf")).thenReturn(new ByteArrayInputStream("%PDF".getBytes()));

        service.open("cnr_abcdefghijklmnopqrstuv",
                new CanaryTokenService.ClientFingerprint("1.2.3.4", "JUnit"), null, "req-geo");

        var captor = org.mockito.ArgumentCaptor.forClass(com.soa.gr6.lms.domain.CanaryAccess.class);
        org.mockito.Mockito.verify(accesses).save(captor.capture());
        var access = captor.getValue();
        assertThat(access.getIpAddress()).isEqualTo("1.2.3.4");
        assertThat(access.getIpVersion()).isEqualTo("IPv4");
        assertThat(access.getLocationSource()).isEqualTo(IpLocation.SOURCE_PENDING);
        assertThat(access.getCityName()).isNull();
        assertThat(access.getIpHash()).isNotEqualTo("1.2.3.4");
        // Không gọi dịch vụ geolocation trên luồng đọc PDF.
        org.mockito.Mockito.verifyNoInteractions(geolocation);
    }

    @Test
    void openHandsLocationResolutionToTheBackgroundEnricherAfterTheRowExists() {
        CanaryToken active = token(Instant.now().plus(Duration.ofMinutes(10)), CanaryPurpose.READ, loan);
        when(tokens.findByTokenHash(any())).thenReturn(Optional.of(active));
        when(storage.open("books/x/f.pdf")).thenReturn(new ByteArrayInputStream("%PDF".getBytes()));
        when(accesses.save(any(com.soa.gr6.lms.domain.CanaryAccess.class))).thenAnswer(call -> {
            var saved = (com.soa.gr6.lms.domain.CanaryAccess) call.getArgument(0);
            org.springframework.test.util.ReflectionTestUtils.setField(saved, "id", 42L);
            return saved;
        });

        service.open("cnr_abcdefghijklmnopqrstuv",
                new CanaryTokenService.ClientFingerprint("1.2.3.4", "JUnit"), null, "req-geo");

        org.mockito.Mockito.verify(locationEnricher).enrich(42L, "1.2.3.4");
    }

    @Test
    void accessesResolvesRowsLeftPendingWhenTheBackgroundTaskNeverRan() {
        UUID tokenId = UUID.randomUUID();
        CanaryAccess stuck = pendingAccessRow(99L, "203.113.1.1");
        when(tokens.existsById(tokenId)).thenReturn(true);
        when(accesses.findByTokenIdOrderByAccessedAtDesc(any(), any()))
                .thenReturn(new PageImpl<>(List.of(stuck), PageRequest.of(0, 20), 1));
        when(locationEnricher.resolveNow(99L, "203.113.1.1"))
                .thenReturn(new IpLocation("203.113.1.1", "IPv4", "VN", "Vietnam", "Hanoi", "Hanoi",
                        21.03, 105.85, "Asia/Bangkok", "Viettel", IpLocation.SOURCE_GEOIP));

        var page = service.accesses(tokenId, PageRequest.of(0, 20));

        var row = page.getContent().get(0);
        assertThat(row.ipAddress()).isEqualTo("203.113.1.1");
        assertThat(row.location().city()).isEqualTo("Hanoi");
        assertThat(row.location().source()).isEqualTo(IpLocation.SOURCE_GEOIP);
    }

    @Test
    void accessesDoesNotResolveRowsThatAlreadyHaveALocation() {
        UUID tokenId = UUID.randomUUID();
        CanaryAccess resolved = pendingAccessRow(5L, "1.2.3.4");
        resolved.applyLocation(new IpLocation("1.2.3.4", "IPv4", "VN", "Vietnam", "Hanoi", "Hanoi",
                21.03, 105.85, "Asia/Bangkok", "Viettel", IpLocation.SOURCE_GEOIP));
        when(tokens.existsById(tokenId)).thenReturn(true);
        when(accesses.findByTokenIdOrderByAccessedAtDesc(any(), any()))
                .thenReturn(new PageImpl<>(List.of(resolved), PageRequest.of(0, 20), 1));

        service.accesses(tokenId, PageRequest.of(0, 20));

        org.mockito.Mockito.verify(locationEnricher, org.mockito.Mockito.never()).resolveNow(any(), any());
    }

    private CanaryAccess pendingAccessRow(long id, String ipAddress) {
        CanaryAccess access = new CanaryAccess(UUID.randomUUID(), Instant.now(), "hash", "ua",
                CanaryOutcome.OK, 1L, null, "req", ipAddress);
        org.springframework.test.util.ReflectionTestUtils.setField(access, "id", id);
        return access;
    }

    @Test
    void groupsAggregateTokensPerReaderAndBook() {
        Instant lastSeen = Instant.now();
        var row = new CanaryGroupRow(bookId, "Clean Code", userId, "reader@example.com", "Reader",
                3, 12, 2, lastSeen, Instant.now().minus(Duration.ofHours(2)));
        when(tokens.findGroups(org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.eq("reader@example.com"), any(), any())).thenReturn(List.of(row));
        when(tokens.countGroups(org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.eq("reader@example.com"))).thenReturn(1L);
        when(accesses.countDistinctIpsForReader(bookId, userId)).thenReturn(2L);

        var page = service.groups(null, "reader@example.com", PageRequest.of(0, 10));

        assertThat(page.getTotalElements()).isEqualTo(1);
        var group = page.getContent().get(0);
        assertThat(group.book().title()).isEqualTo("Clean Code");
        assertThat(group.user().email()).isEqualTo("reader@example.com");
        assertThat(group.user().fullName()).isEqualTo("Reader");
        assertThat(group.tokenCount()).isEqualTo(3);
        assertThat(group.activeTokenCount()).isEqualTo(2);
        assertThat(group.accessCount()).isEqualTo(12);
        assertThat(group.distinctIpCount()).isEqualTo(2);
        assertThat(group.lastSeenAt()).isEqualTo(lastSeen);
    }

    @Test
    void groupsPassPaginationAndBookFilterToTheQuery() {
        var first = new CanaryGroupRow(bookId, "Clean Code", UUID.randomUUID(), "c@example.com", "C",
                1, 1, 1, Instant.now(), Instant.now());
        var second = new CanaryGroupRow(bookId, "Clean Code", UUID.randomUUID(), "d@example.com", "D",
                1, 1, 1, Instant.now(), Instant.now());
        when(tokens.findGroups(org.mockito.ArgumentMatchers.eq(bookId), org.mockito.ArgumentMatchers.eq(""),
                any(), any())).thenReturn(List.of(first, second));
        when(tokens.countGroups(org.mockito.ArgumentMatchers.eq(bookId),
                org.mockito.ArgumentMatchers.eq(""))).thenReturn(12L);

        var page = service.groups(bookId, "",
                PageRequest.of(1, 5, org.springframework.data.domain.Sort.by("issuedAt")));

        var pageableCaptor = org.mockito.ArgumentCaptor
                .forClass(org.springframework.data.domain.Pageable.class);
        org.mockito.Mockito.verify(tokens).findGroups(org.mockito.ArgumentMatchers.eq(bookId),
                org.mockito.ArgumentMatchers.eq(""), any(), pageableCaptor.capture());
        assertThat(pageableCaptor.getValue().getPageNumber()).isEqualTo(1);
        assertThat(pageableCaptor.getValue().getPageSize()).isEqualTo(5);
        // Sort của client bị bỏ để thứ tự cố định trong query không bị phá.
        assertThat(pageableCaptor.getValue().getSort().isSorted()).isFalse();
        assertThat(page.getTotalElements()).isEqualTo(12);
        assertThat(page.getTotalPages()).isEqualTo(3);
        assertThat(page.getContent()).hasSize(2);
        assertThat(page.getContent().get(0).user().email()).isEqualTo("c@example.com");
        org.mockito.Mockito.verify(tokens).countGroups(bookId, "");
        // Chỉ 2 nhóm của trang hiện tại được đếm IP, không phải 12 nhóm trong toàn bộ kết quả.
        org.mockito.Mockito.verify(accesses, org.mockito.Mockito.times(2))
                .countDistinctIpsForReader(any(), any());
    }

    @Test
    void groupsUseGlobalCountWhenNoBookFilterIsGiven() {
        when(tokens.findGroups(org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.eq(""),
                any(), any())).thenReturn(List.of());
        when(tokens.countGroups(org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.eq(""))).thenReturn(42L);

        var page = service.groups(null, null, PageRequest.of(0, 10));

        assertThat(page.getTotalElements()).isEqualTo(42);
        assertThat(page.getContent()).isEmpty();
        org.mockito.Mockito.verify(tokens).countGroups(null, "");
    }

    @Test
    void detailResolvesLocationOfTheIssuingIp() {
        CanaryToken active = token(Instant.now().plus(Duration.ofMinutes(10)), CanaryPurpose.READ, loan);
        when(tokens.findById(active.getId())).thenReturn(Optional.of(active));

        var detail = service.detail(active.getId());

        assertThat(detail.createdLocation()).isNotNull();
        assertThat(detail.createdLocation().city()).isEqualTo("Hanoi");
    }

    @Test
    void openReturnsPartialContentForRangeHeader() {
        CanaryToken active = token(Instant.now().plus(Duration.ofMinutes(10)), CanaryPurpose.READ, loan);
        when(tokens.findByTokenHash(any())).thenReturn(Optional.of(active));
        when(storage.open("books/x/f.pdf")).thenReturn(new ByteArrayInputStream(new byte[460]));

        var payload = service.open("cnr_abcdefghijklmnopqrstuv", null, "bytes=10-19", "req-2");

        assertThat(payload.partial()).isTrue();
        assertThat(payload.start()).isEqualTo(10);
        assertThat(payload.length()).isEqualTo(10);
    }

    @Test
    void openRejectsExpiredToken() {
        CanaryToken expired = token(Instant.now().minus(Duration.ofMinutes(1)), CanaryPurpose.READ, loan);
        when(tokens.findByTokenHash(any())).thenReturn(Optional.of(expired));

        assertThatThrownBy(() -> service.open("cnr_abcdefghijklmnopqrstuv", null, null, "req-3"))
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getErrorCode())
                .isEqualTo(ErrorCode.CANARY_TOKEN_EXPIRED);
    }

    @Test
    void openRejectsRevokedToken() {
        CanaryToken revoked = token(Instant.now().plus(Duration.ofMinutes(10)), CanaryPurpose.READ, loan);
        revoked.revoke(CanaryRevokeReason.ADMIN, UUID.randomUUID(), Instant.now());
        when(tokens.findByTokenHash(any())).thenReturn(Optional.of(revoked));

        assertThatThrownBy(() -> service.open("cnr_abcdefghijklmnopqrstuv", null, null, "req-4"))
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getErrorCode())
                .isEqualTo(ErrorCode.CANARY_TOKEN_REVOKED);
    }

    @Test
    void openRevokesReadTokenWhenLoanIsNoLongerOpen() {
        when(loan.getStatus()).thenReturn(LoanStatus.RETURNED);
        CanaryToken active = token(Instant.now().plus(Duration.ofMinutes(10)), CanaryPurpose.READ, loan);
        when(tokens.findByTokenHash(any())).thenReturn(Optional.of(active));

        assertThatThrownBy(() -> service.open("cnr_abcdefghijklmnopqrstuv", null, null, "req-5"))
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getErrorCode())
                .isEqualTo(ErrorCode.CANARY_TOKEN_REVOKED);

        assertThat(active.isRevoked()).isTrue();
        assertThat(active.getRevokeReason()).isEqualTo(CanaryRevokeReason.RETURNED);
    }

    @Test
    void openRejectsUnknownTokenWithoutLeakingWhetherItExisted() {
        when(tokens.findByTokenHash(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.open("cnr_unknown", null, null, "req-6"))
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getErrorCode())
                .isEqualTo(ErrorCode.CANARY_TOKEN_NOT_FOUND);
    }

    @Test
    void openRecordsFailedAttemptsForRevokedToken() {
        CanaryToken revoked = token(Instant.now().plus(Duration.ofMinutes(10)), CanaryPurpose.READ, loan);
        revoked.revoke(CanaryRevokeReason.RETURNED, null, Instant.now());
        when(tokens.findByTokenHash(any())).thenReturn(Optional.of(revoked));

        assertThatThrownBy(() -> service.open("cnr_abcdefghijklmnopqrstuv", null, null, "req-7"))
                .isInstanceOf(ApiException.class);

        var captor = org.mockito.ArgumentCaptor.forClass(com.soa.gr6.lms.domain.CanaryAccess.class);
        org.mockito.Mockito.verify(accesses).save(captor.capture());
        assertThat(captor.getValue().getOutcome()).isEqualTo(CanaryOutcome.REVOKED);
        assertThat(captor.getValue().getTokenId()).isEqualTo(revoked.getId());
    }

    @Test
    void issueIsRateLimitedAfterConfiguredAttempts() {
        givenFullFile();
        givenOpenLoan();
        CanaryTokenServiceImpl limited = serviceWithLimits(1, 120);

        assertThat(limited.issue(userId, bookId, CanaryPurpose.READ, null).url()).isNotBlank();
        assertThatThrownBy(() -> limited.issue(userId, bookId, CanaryPurpose.READ, null))
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getErrorCode())
                .isEqualTo(ErrorCode.RATE_LIMITED);
    }

    @Test
    void streamIsRateLimitedPerToken() {
        CanaryToken active = token(Instant.now().plus(Duration.ofMinutes(10)), CanaryPurpose.READ, loan);
        when(tokens.findByTokenHash(any())).thenReturn(Optional.of(active));
        when(storage.open("books/x/f.pdf")).thenReturn(new ByteArrayInputStream(new byte[460]));
        CanaryTokenServiceImpl limited = serviceWithLimits(10, 1);

        limited.open("cnr_abcdefghijklmnopqrstuv", null, null, "req-a");
        assertThatThrownBy(() -> limited.open("cnr_abcdefghijklmnopqrstuv", null, null, "req-b"))
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getErrorCode())
                .isEqualTo(ErrorCode.RATE_LIMITED);
    }

    @Test
    void detailFlagsAccessAfterReturnedAtOnlyAfterTheBookComesBack() {
        CanaryToken active = token(Instant.now().plus(Duration.ofMinutes(10)), CanaryPurpose.READ, loan);
        Instant borrowedAt = Instant.now().minus(Duration.ofHours(2));
        when(loan.getBorrowedAt()).thenReturn(borrowedAt);
        active.registerAccess(borrowedAt.plus(Duration.ofMinutes(30)));
        when(tokens.findById(active.getId())).thenReturn(Optional.of(active));

        assertThat(service.detail(active.getId()).riskFlags()).doesNotContain("ACCESSED_AFTER_RETURN");

        Instant returnedAt = borrowedAt.plus(Duration.ofHours(1));
        when(loan.getStatus()).thenReturn(LoanStatus.RETURNED);
        when(loan.getReturnedAt()).thenReturn(returnedAt);
        active.registerAccess(returnedAt.plus(Duration.ofMinutes(5)));

        assertThat(service.detail(active.getId()).riskFlags()).contains("ACCESSED_AFTER_RETURN");
    }

    @Test
    void lookupRejectsTooShortPrefix() {
        assertThatThrownBy(() -> service.lookup("cnr"))
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getErrorCode())
                .isEqualTo(ErrorCode.VALIDATION_FAILED);
    }

    @Test
    void lookupAcceptsFullUrlAndHashesOnlyTheToken() {
        CanaryToken active = token(Instant.now().plus(Duration.ofMinutes(10)), CanaryPurpose.READ, loan);
        when(tokens.findByTokenHash(CanaryTokenServiceImpl.sha256("cnr_abcdefghijklmnopqrstuv")))
                .thenReturn(Optional.of(active));

        var result = service.lookup("http://localhost:8080/api/v1/reader/files/cnr_abcdefghijklmnopqrstuv");

        assertThat(result.matched()).isTrue();
        assertThat(result.matchType()).isEqualTo("URL");
        assertThat(result.tokens()).hasSize(1);
    }

    @Test
    void revokeMarksTokenAndKeepsFirstTimestamp() {
        CanaryToken active = token(Instant.now().plus(Duration.ofMinutes(10)), CanaryPurpose.READ, loan);
        when(tokens.findById(active.getId())).thenReturn(Optional.of(active));
        when(tokens.save(any(CanaryToken.class))).thenAnswer(call -> call.getArgument(0));

        service.revoke(active.getId(), CanaryRevokeReason.ADMIN, UUID.randomUUID());
        service.revoke(active.getId(), CanaryRevokeReason.SUSPENDED, UUID.randomUUID());

        assertThat(active.getRevokeReason()).isEqualTo(CanaryRevokeReason.ADMIN);
        assertThat(active.getRevokedAt()).isNotNull();
    }

    @Test
    void revokeForUserOnlyTouchesActiveTokens() {
        CanaryToken active = token(Instant.now().plus(Duration.ofMinutes(10)), CanaryPurpose.READ, loan);
        when(tokens.findByUserIdAndBookIdAndRevokedAtIsNull(userId, bookId)).thenReturn(List.of(active));

        int revoked = service.revokeForUser(userId, bookId, CanaryRevokeReason.SUSPENDED);

        assertThat(revoked).isEqualTo(1);
        assertThat(active.getRevokeReason()).isEqualTo(CanaryRevokeReason.SUSPENDED);
    }
}
