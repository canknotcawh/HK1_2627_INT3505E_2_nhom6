package com.soa.gr6.lms.service;

import com.soa.gr6.lms.domain.enums.CanaryPurpose;
import com.soa.gr6.lms.domain.enums.CanaryRevokeReason;
import com.soa.gr6.lms.dto.CanaryAccessResponse;
import com.soa.gr6.lms.dto.CanaryLinkResponse;
import com.soa.gr6.lms.dto.CanaryLookupResult;
import com.soa.gr6.lms.dto.CanaryTokenDetail;
import com.soa.gr6.lms.dto.CanaryTokenSummary;
import com.soa.gr6.lms.dto.ReadingAccessResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.io.InputStream;
import java.util.UUID;

public interface CanaryTokenService {

    CanaryLinkResponse issue(UUID userId, UUID bookId, CanaryPurpose purpose, ClientFingerprint fingerprint);

    ReadingAccessResponse readingAccess(UUID userId, UUID bookId);

    /** Kiểm tra token và trả stream (đã cắt theo Range nếu có). */
    ReaderPayload open(String rawToken, ClientFingerprint fingerprint, String rangeHeader, String requestId);

    Page<CanaryTokenSummary> list(UUID bookId, UUID userId, String status, String q, Pageable pageable);

    CanaryTokenDetail detail(UUID tokenId);

    Page<CanaryAccessResponse> accesses(UUID tokenId, Pageable pageable);

    CanaryTokenDetail revoke(UUID tokenId, CanaryRevokeReason reason, UUID adminId);

    int revokeForUser(UUID userId, UUID bookId, CanaryRevokeReason reason);

    CanaryLookupResult lookup(String value);

    record ClientFingerprint(String ip, String userAgent) {
    }

    record ReaderPayload(String fileName, long totalSize, long start, long length, InputStream stream) {

        public boolean partial() {
            return start > 0 || length != totalSize;
        }
    }
}
