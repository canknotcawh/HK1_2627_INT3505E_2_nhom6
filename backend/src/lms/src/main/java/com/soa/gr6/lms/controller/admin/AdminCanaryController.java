package com.soa.gr6.lms.controller.admin;

import com.soa.gr6.lms.domain.enums.CanaryRevokeReason;
import com.soa.gr6.lms.dto.CanaryAccessResponse;
import com.soa.gr6.lms.dto.CanaryGroupSummary;
import com.soa.gr6.lms.dto.CanaryLookupResult;
import com.soa.gr6.lms.dto.CanaryReadingEventResponse;
import com.soa.gr6.lms.dto.CanaryRevokeCountResponse;
import com.soa.gr6.lms.dto.CanaryRevokeForUserRequest;
import com.soa.gr6.lms.dto.CanaryRevokeRequest;
import com.soa.gr6.lms.dto.CanaryTokenDetail;
import com.soa.gr6.lms.dto.CanaryTokenSummary;
import com.soa.gr6.lms.security.AuthenticatedUser;
import com.soa.gr6.lms.service.CanaryTokenService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/canary-tokens")
public class AdminCanaryController {

    private final CanaryTokenService canaryTokenService;

    public AdminCanaryController(CanaryTokenService canaryTokenService) {
        this.canaryTokenService = canaryTokenService;
    }

    @GetMapping
    public Page<CanaryTokenSummary> list(@RequestParam(required = false) UUID bookId,
                                         @RequestParam(required = false) UUID userId,
                                         @RequestParam(required = false) String status,
                                         @RequestParam(required = false) String q,
                                         @PageableDefault(size = 20, sort = "issuedAt", direction = Sort.Direction.DESC)
                                         Pageable pageable) {
        return canaryTokenService.list(bookId, userId, status, q, pageable);
    }

    /** Danh sách gom theo người đọc + sách; bấm vào một nhóm mới tải các token bên trong. */
    @GetMapping("/groups")
    public Page<CanaryGroupSummary> groups(@RequestParam(required = false) String q,
                                           @RequestParam(required = false) UUID bookId,
                                           @PageableDefault(size = 10) Pageable pageable) {
        return canaryTokenService.groups(bookId, q, pageable);
    }

    @GetMapping("/{tokenId}")
    public CanaryTokenDetail detail(@PathVariable UUID tokenId) {
        return canaryTokenService.detail(tokenId);
    }

    @GetMapping("/{tokenId}/accesses")
    public Page<CanaryAccessResponse> accesses(@PathVariable UUID tokenId,
                                               @PageableDefault(size = 20) Pageable pageable) {
        return canaryTokenService.accesses(tokenId, pageable);
    }

    /** Dòng thời gian mở/đóng/tải lại/hành vi đáng ngờ trên bản PDF của token. */
    @GetMapping("/{tokenId}/events")
    public Page<CanaryReadingEventResponse> events(@PathVariable UUID tokenId,
                                                   @PageableDefault(size = 20) Pageable pageable) {
        return canaryTokenService.readingEvents(tokenId, pageable);
    }

    @GetMapping("/lookup")
    public CanaryLookupResult lookup(@RequestParam String value) {
        return canaryTokenService.lookup(value);
    }

    @PostMapping("/{tokenId}/revoke")
    public CanaryTokenDetail revoke(@PathVariable UUID tokenId,
                                    @RequestBody(required = false) CanaryRevokeRequest request,
                                    @AuthenticationPrincipal AuthenticatedUser admin) {
        CanaryRevokeReason reason = request == null ? CanaryRevokeReason.ADMIN : request.reasonOrDefault();
        return canaryTokenService.revoke(tokenId, reason, admin == null ? null : admin.id());
    }

    @PostMapping("/revoke-for-user")
    public CanaryRevokeCountResponse revokeForUser(@Valid @RequestBody CanaryRevokeForUserRequest request) {
        return new CanaryRevokeCountResponse(
                canaryTokenService.revokeForUser(request.userId(), request.bookId(), CanaryRevokeReason.SUSPENDED));
    }
}
