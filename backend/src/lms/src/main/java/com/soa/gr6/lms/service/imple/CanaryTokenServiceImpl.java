package com.soa.gr6.lms.service.imple;

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
import com.soa.gr6.lms.domain.enums.UserStatus;
import com.soa.gr6.lms.dto.CanaryAccessResponse;
import com.soa.gr6.lms.dto.CanaryLinkResponse;
import com.soa.gr6.lms.dto.CanaryLookupResult;
import com.soa.gr6.lms.dto.CanaryTokenDetail;
import com.soa.gr6.lms.dto.CanaryTokenSummary;
import com.soa.gr6.lms.dto.ReadingAccessResponse;
import com.soa.gr6.lms.exception.ApiException;
import com.soa.gr6.lms.exception.BookNotFoundException;
import com.soa.gr6.lms.exception.ErrorCode;
import com.soa.gr6.lms.repository.BookFileRepository;
import com.soa.gr6.lms.repository.BookRepository;
import com.soa.gr6.lms.repository.CanaryAccessRepository;
import com.soa.gr6.lms.repository.CanaryTokenRepository;
import com.soa.gr6.lms.repository.LoanRepository;
import com.soa.gr6.lms.repository.UserRepository;
import com.soa.gr6.lms.service.CanaryTokenService;
import com.soa.gr6.lms.service.support.PageableSupport;
import com.soa.gr6.lms.service.support.RateLimiter;
import com.soa.gr6.lms.storage.StorageException;
import com.soa.gr6.lms.storage.StorageService;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
public class CanaryTokenServiceImpl implements CanaryTokenService {

    private static final int TOKEN_BYTES = 16;
    private static final String TOKEN_PREFIX = "cnr_";
    /** "cnr_" + 16 byte base64url không padding = 26 ký tự. */
    private static final int TOKEN_LENGTH = TOKEN_PREFIX.length() + 22;
    private static final int VISIBLE_PREFIX_LENGTH = 10;
    private static final int SUFFIX_LENGTH = 6;
    private static final int MAX_PAGE_SIZE = 100;
    private static final String DEV_PEPPER = "dev-only-canary-ip-pepper-32-bytes-minimum";
    private static final DateTimeFormatter WATERMARK_TIME =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm").withZone(ZoneId.of("Asia/Ho_Chi_Minh"));

    private final SecureRandom random = new SecureRandom();

    private final CanaryTokenRepository tokenRepository;
    private final CanaryAccessRepository accessRepository;
    private final BookRepository bookRepository;
    private final BookFileRepository bookFileRepository;
    private final LoanRepository loanRepository;
    private final UserRepository userRepository;
    private final StorageService storageService;
    private final RateLimiter rateLimiter;
    private final Environment environment;

    private final Duration readTtl;
    private final Duration previewTtl;
    private final Duration maxTtl;
    private final String ipPepper;
    private final int issueLimitPerMinute;
    private final int streamLimitPerMinute;

    public CanaryTokenServiceImpl(CanaryTokenRepository tokenRepository,
                                  CanaryAccessRepository accessRepository,
                                  BookRepository bookRepository,
                                  BookFileRepository bookFileRepository,
                                  LoanRepository loanRepository,
                                  UserRepository userRepository,
                                  StorageService storageService,
                                  RateLimiter rateLimiter,
                                  Environment environment,
                                  @Value("${app.canary.read-ttl:30m}") Duration readTtl,
                                  @Value("${app.canary.preview-ttl:15m}") Duration previewTtl,
                                  @Value("${app.canary.max-ttl:12h}") Duration maxTtl,
                                  @Value("${app.canary.ip-pepper:}") String ipPepper,
                                  @Value("${app.canary.rate-limit.issue-per-minute:10}") int issueLimitPerMinute,
                                  @Value("${app.canary.rate-limit.stream-per-minute:120}") int streamLimitPerMinute) {
        this.tokenRepository = tokenRepository;
        this.accessRepository = accessRepository;
        this.bookRepository = bookRepository;
        this.bookFileRepository = bookFileRepository;
        this.loanRepository = loanRepository;
        this.userRepository = userRepository;
        this.storageService = storageService;
        this.rateLimiter = rateLimiter;
        this.environment = environment;
        this.readTtl = readTtl;
        this.previewTtl = previewTtl;
        this.maxTtl = maxTtl;
        this.ipPepper = ipPepper;
        this.issueLimitPerMinute = issueLimitPerMinute;
        this.streamLimitPerMinute = streamLimitPerMinute;
    }

    /** Ở prod bắt buộc có pepper riêng; dev dùng pepper cố định để không phải cấu hình. */
    @PostConstruct
    void validatePepper() {
        boolean development = environment.acceptsProfiles(Profiles.of("dev"));
        if (!development && (ipPepper == null || ipPepper.getBytes(StandardCharsets.UTF_8).length < 32)) {
            throw new IllegalStateException("CANARY_IP_PEPPER must contain at least 32 UTF-8 bytes");
        }
    }

    private String pepper() {
        return ipPepper == null || ipPepper.isBlank() ? DEV_PEPPER : ipPepper;
    }

    @Override
    @Transactional
    public CanaryLinkResponse issue(UUID userId, UUID bookId, CanaryPurpose purpose, ClientFingerprint fingerprint) {
        // 10 lần/phút/user/book để một tài khoản không quay vòng token liên tục.
        if (!rateLimiter.tryAcquire("issue:" + userId + ":" + bookId,
                issueLimitPerMinute, Duration.ofMinutes(1))) {
            throw new ApiException(ErrorCode.RATE_LIMITED);
        }
        User user = userRepository.findById(userId).orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }
        Book book = bookRepository.findById(bookId).orElseThrow(() -> new BookNotFoundException(bookId));

        BookFileKind kind = purpose == CanaryPurpose.READ ? BookFileKind.FULL : BookFileKind.PREVIEW;
        BookFile file = bookFileRepository
                .findByBookIdAndKindAndStatus(bookId, kind, BookFileStatus.ACTIVE)
                .orElseThrow(() -> new ApiException(ErrorCode.BOOK_FILE_NOT_AVAILABLE));

        Loan loan = null;
        if (purpose == CanaryPurpose.READ) {
            loan = loanRepository
                    .findFirstByUserIdAndBookIdAndStatusInOrderByBorrowedAtDesc(
                            userId, bookId, List.of(LoanStatus.ACTIVE, LoanStatus.OVERDUE, LoanStatus.PENDING_RETURN))
                    .orElseThrow(() -> new ApiException(ErrorCode.LOAN_REQUIRED));
        }

        Instant now = Instant.now();
        Duration ttl = purpose == CanaryPurpose.READ ? readTtl : previewTtl;
        Instant expiresAt = now.plus(ttl);
        Instant absoluteLimit = now.plus(maxTtl);
        if (expiresAt.isAfter(absoluteLimit)) {
            expiresAt = absoluteLimit;
        }

        String raw = newToken();
        CanaryToken token = new CanaryToken(
                UUID.randomUUID(),
                sha256(raw),
                raw.substring(0, VISIBLE_PREFIX_LENGTH),
                book,
                file,
                user,
                loan,
                purpose,
                now,
                expiresAt,
                hmac(fingerprint == null ? null : fingerprint.ip()),
                hmac(fingerprint == null ? null : fingerprint.userAgent()));
        tokenRepository.save(token);

        String suffix = raw.substring(raw.length() - SUFFIX_LENGTH);
        String watermark = "%s • CNR-%s • %s".formatted(
                user.getEmail(), suffix, WATERMARK_TIME.format(now));
        return new CanaryLinkResponse(
                "/api/v1/reader/files/" + raw,
                expiresAt,
                suffix,
                watermark,
                book.getTitle() + ".pdf");
    }

    @Override
    @Transactional(readOnly = true)
    public ReadingAccessResponse readingAccess(UUID userId, UUID bookId) {
        bookRepository.findById(bookId).orElseThrow(() -> new BookNotFoundException(bookId));
        boolean hasFullFile = bookFileRepository
                .findByBookIdAndKindAndStatus(bookId, BookFileKind.FULL, BookFileStatus.ACTIVE).isPresent();
        boolean hasPreviewFile = bookFileRepository
                .findByBookIdAndKindAndStatus(bookId, BookFileKind.PREVIEW, BookFileStatus.ACTIVE).isPresent();
        Optional<Loan> openLoan = loanRepository
                .findFirstByUserIdAndBookIdAndStatusInOrderByBorrowedAtDesc(
                        userId, bookId, List.of(LoanStatus.ACTIVE, LoanStatus.OVERDUE, LoanStatus.PENDING_RETURN));
        return new ReadingAccessResponse(
                hasFullFile && openLoan.isPresent(),
                hasPreviewFile,
                openLoan.map(Loan::getId).orElse(null),
                openLoan.map(Loan::getDueAt).orElse(null),
                hasFullFile,
                hasPreviewFile);
    }

    @Override
    @Transactional
    public ReaderPayload open(String rawToken, ClientFingerprint fingerprint, String rangeHeader, String requestId) {
        if (rawToken == null || rawToken.isBlank()) {
            record(null, CanaryOutcome.NOT_FOUND, fingerprint, null, rangeHeader, requestId);
            throw new ApiException(ErrorCode.CANARY_TOKEN_NOT_FOUND);
        }
        String tokenHash = sha256(rawToken.trim());
        // 120 request/phút/token: đủ cho range request của PDF viewer, chặn polling bất thường.
        if (!rateLimiter.tryAcquire("stream:" + tokenHash, streamLimitPerMinute, Duration.ofMinutes(1))) {
            throw new ApiException(ErrorCode.RATE_LIMITED);
        }
        CanaryToken token = tokenRepository.findByTokenHash(tokenHash).orElse(null);
        if (token == null) {
            record(null, CanaryOutcome.NOT_FOUND, fingerprint, null, rangeHeader, requestId);
            throw new ApiException(ErrorCode.CANARY_TOKEN_NOT_FOUND);
        }
        Instant now = Instant.now();
        if (token.isRevoked()) {
            record(token.getId(), CanaryOutcome.REVOKED, fingerprint, null, rangeHeader, requestId);
            throw new ApiException(ErrorCode.CANARY_TOKEN_REVOKED);
        }
        if (token.isExpired(now)) {
            record(token.getId(), CanaryOutcome.EXPIRED, fingerprint, null, rangeHeader, requestId);
            throw new ApiException(ErrorCode.CANARY_TOKEN_EXPIRED);
        }
        if (token.getUser().getStatus() != UserStatus.ACTIVE
                || !token.getFile().isActive()
                || !token.getBook().getStatus().isBorrowable()) {
            record(token.getId(), CanaryOutcome.FORBIDDEN, fingerprint, null, rangeHeader, requestId);
            throw new ApiException(ErrorCode.CANARY_ACCESS_FORBIDDEN);
        }
        // Loan được kiểm tra lại mỗi lần đọc: trả sách là token chết ngay (T7).
        if (token.getPurpose() == CanaryPurpose.READ
                && (token.getLoan() == null || !token.getLoan().getStatus().isOpen())) {
            token.revoke(CanaryRevokeReason.RETURNED, null, now);
            record(token.getId(), CanaryOutcome.REVOKED, fingerprint, null, rangeHeader, requestId);
            throw new ApiException(ErrorCode.CANARY_TOKEN_REVOKED);
        }

        long total = token.getFile().getSizeBytes();
        long[] range = parseRange(rangeHeader, total);
        long start = range[0];
        long length = range[1];
        InputStream stream;
        try {
            stream = storageService.open(token.getFile().getStorageKey());
            skipFully(stream, start);
        } catch (StorageException e) {
            record(token.getId(), CanaryOutcome.FORBIDDEN, fingerprint, null, rangeHeader, requestId);
            throw new ApiException(ErrorCode.CANARY_FILE_UNAVAILABLE);
        }

        token.registerAccess(now);
        record(token.getId(), CanaryOutcome.OK, fingerprint, length, rangeHeader, requestId);
        return new ReaderPayload(token.getFile().getOriginalName(), total, start, length, stream);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CanaryTokenSummary> list(UUID bookId, UUID userId, String status, String q, Pageable pageable) {
        Pageable clamped = PageableSupport.clamp(pageable, MAX_PAGE_SIZE);
        Pageable sorted = clamped.getSort().isSorted()
                ? clamped
                : PageRequest.of(clamped.getPageNumber(), clamped.getPageSize(), Sort.by(Sort.Direction.DESC, "issuedAt"));
        String normalizedStatus = normalizeStatus(status);
        String query = q == null || q.isBlank() ? "" : q.trim();
        Instant now = Instant.now();
        return tokenRepository.search(bookId, userId, normalizedStatus, query, now, sorted)
                .map(token -> summary(token, now));
    }

    @Override
    @Transactional(readOnly = true)
    public CanaryTokenDetail detail(UUID tokenId) {
        Instant now = Instant.now();
        CanaryToken token = tokenRepository.findById(tokenId)
                .orElseThrow(() -> new ApiException(ErrorCode.CANARY_TOKEN_NOT_FOUND));
        long distinctIps = accessRepository.countDistinctIps(token.getId());

        List<String> riskFlags = new ArrayList<>();
        if (distinctIps > 1) {
            riskFlags.add("MANY_IPS");
        }
        // So với thời điểm thủ thư nhận lại sách, không phải lúc bắt đầu mượn: mọi lượt đọc
        // trong thời gian mượn đều hợp lệ, chỉ lần đọc sau returnedAt mới là dấu hiệu bất thường.
        Instant returnedAt = token.getLoan() == null ? null : token.getLoan().getReturnedAt();
        if (returnedAt != null && token.getLastSeenAt() != null
                && token.getLastSeenAt().isAfter(returnedAt)) {
            riskFlags.add("ACCESSED_AFTER_RETURN");
        }

        BookFile file = token.getFile();
        return new CanaryTokenDetail(
                CanaryTokenSummary.of(token, now, distinctIps),
                token.getRevokeReason() == null ? null : token.getRevokeReason().name(),
                token.getCreatedIpHash(),
                token.getCreatedUaHash(),
                new CanaryTokenDetail.FileRef(file.getId(), file.getKind().name(), file.getOriginalName(),
                        file.getSizeBytes(), file.getSha256()),
                riskFlags);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CanaryAccessResponse> accesses(UUID tokenId, Pageable pageable) {
        if (!tokenRepository.existsById(tokenId)) {
            throw new ApiException(ErrorCode.CANARY_TOKEN_NOT_FOUND);
        }
        return accessRepository.findByTokenIdOrderByAccessedAtDesc(tokenId, PageableSupport.clamp(pageable, MAX_PAGE_SIZE))
                .map(CanaryAccessResponse::from);
    }

    @Override
    @Transactional
    public CanaryTokenDetail revoke(UUID tokenId, CanaryRevokeReason reason, UUID adminId) {
        CanaryToken token = tokenRepository.findById(tokenId)
                .orElseThrow(() -> new ApiException(ErrorCode.CANARY_TOKEN_NOT_FOUND));
        token.revoke(reason, adminId, Instant.now());
        tokenRepository.save(token);
        return detail(tokenId);
    }

    @Override
    @Transactional
    public int revokeForUser(UUID userId, UUID bookId, CanaryRevokeReason reason) {
        List<CanaryToken> tokens = bookId == null
                ? tokenRepository.findByUserIdAndRevokedAtIsNull(userId)
                : tokenRepository.findByUserIdAndBookIdAndRevokedAtIsNull(userId, bookId);
        Instant now = Instant.now();
        tokens.forEach(token -> token.revoke(reason, null, now));
        tokenRepository.saveAll(tokens);
        return tokens.size();
    }

    @Override
    @Transactional(readOnly = true)
    public CanaryLookupResult lookup(String value) {
        String raw = value == null ? "" : value.trim();
        String matchType = null;
        String tokenValue = null;

        if (raw.contains("/reader/files/")) {
            tokenValue = raw.substring(raw.indexOf("/reader/files/") + "/reader/files/".length());
            if (tokenValue.contains("?") || tokenValue.contains("#")) {
                tokenValue = tokenValue.substring(0, indexOfAny(tokenValue, '?', '#'));
            }
            matchType = "URL";
        } else if (raw.startsWith(TOKEN_PREFIX) && raw.length() == TOKEN_LENGTH) {
            tokenValue = raw;
            matchType = "TOKEN";
        }

        if (tokenValue != null) {
            String candidate = tokenValue;
            String type = matchType;
            Optional<CanaryToken> token = tokenRepository.findByTokenHash(sha256(candidate));
            return token.map(found -> singleMatch(type, found))
                    .orElseGet(() -> new CanaryLookupResult(false, type, List.of(), List.of()));
        }

        if (raw.length() < 6) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
        List<CanaryToken> byPrefix = tokenRepository
                .findTop20ByTokenPrefixStartingWithOrderByIssuedAtDesc(raw);
        Instant now = Instant.now();
        List<CanaryTokenSummary> summaries = byPrefix.stream().map(token -> summary(token, now)).toList();
        return new CanaryLookupResult(!summaries.isEmpty(), "PREFIX", summaries, List.of());
    }

    private CanaryLookupResult singleMatch(String matchType, CanaryToken token) {
        Instant now = Instant.now();
        CanaryTokenSummary summary = summary(token, now);
        List<String> signals = new ArrayList<>();
        signals.add(switch (token.status(now)) {
            case ACTIVE -> "Token còn hạn";
            case EXPIRED -> "Token đã hết hạn";
            case REVOKED -> "Token đã bị thu hồi";
        });
        if (summary.distinctIpCount() > 1) {
            signals.add(summary.distinctIpCount() + " IP khác nhau");
        }
        if (token.getLastSeenAt() != null) {
            signals.add("Lần đọc cuối: " + WATERMARK_TIME.format(token.getLastSeenAt()));
        }
        if (token.getRevokeReason() != null) {
            signals.add("Lý do thu hồi: " + token.getRevokeReason().name());
        }
        return new CanaryLookupResult(true, matchType, List.of(summary), signals);
    }

    private CanaryTokenSummary summary(CanaryToken token, Instant now) {
        return CanaryTokenSummary.of(token, now, accessRepository.countDistinctIps(token.getId()));
    }

    private static int indexOfAny(String value, char... chars) {
        int result = -1;
        for (char c : chars) {
            int index = value.indexOf(c);
            if (index >= 0 && (result < 0 || index < result)) {
                result = index;
            }
        }
        return result;
    }

    private static String normalizeStatus(String status) {
        if (status == null || status.isBlank()) {
            return "";
        }
        String upper = status.trim().toUpperCase(Locale.ROOT);
        return upper.equals("ACTIVE") || upper.equals("EXPIRED") || upper.equals("REVOKED") ? upper : "";
    }

    private void record(UUID tokenId, CanaryOutcome outcome, ClientFingerprint fingerprint,
                        Long bytesSent, String rangeHeader, String requestId) {
        accessRepository.save(new CanaryAccess(
                tokenId,
                Instant.now(),
                hmac(fingerprint == null ? null : fingerprint.ip()),
                hmac(fingerprint == null ? null : fingerprint.userAgent()),
                outcome,
                bytesSent,
                rangeHeader == null ? null : rangeHeader.length() > 50 ? rangeHeader.substring(0, 50) : rangeHeader,
                requestId));
    }

    /** Trả về {start, length}; header sai/không có thì trả toàn bộ file. */
    private static long[] parseRange(String header, long total) {
        if (header == null || !header.startsWith("bytes=") || total <= 0) {
            return new long[]{0, total};
        }
        String spec = header.substring("bytes=".length()).split(",")[0].trim();
        try {
            int dash = spec.indexOf('-');
            if (dash < 0) {
                return new long[]{0, total};
            }
            String startPart = spec.substring(0, dash).trim();
            String endPart = spec.substring(dash + 1).trim();
            long start = startPart.isEmpty() ? 0 : Long.parseLong(startPart);
            long end = endPart.isEmpty() ? total - 1 : Long.parseLong(endPart);
            if (start < 0 || start >= total) {
                return new long[]{0, total};
            }
            end = Math.min(end, total - 1);
            if (end < start) {
                return new long[]{0, total};
            }
            return new long[]{start, end - start + 1};
        } catch (NumberFormatException e) {
            return new long[]{0, total};
        }
    }

    private static void skipFully(InputStream stream, long count) throws StorageException {
        try {
            long remaining = count;
            while (remaining > 0) {
                long skipped = stream.skip(remaining);
                if (skipped <= 0) {
                    if (stream.read() < 0) {
                        throw new StorageException("stored file ended before the requested range");
                    }
                    remaining--;
                } else {
                    remaining -= skipped;
                }
            }
        } catch (IOException e) {
            throw new StorageException("cannot read stored file", e);
        }
    }

    private String newToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        random.nextBytes(bytes);
        return TOKEN_PREFIX + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    static String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private String hmac(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(pepper().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("cannot hash client fingerprint", e);
        }
    }
}
