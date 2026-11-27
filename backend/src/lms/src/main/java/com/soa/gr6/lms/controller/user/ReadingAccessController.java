package com.soa.gr6.lms.controller.user;

import com.soa.gr6.lms.dto.CanaryLinkResponse;
import com.soa.gr6.lms.dto.ReadingAccessRequest;
import com.soa.gr6.lms.dto.ReadingAccessResponse;
import com.soa.gr6.lms.security.AuthenticatedUser;
import com.soa.gr6.lms.service.CanaryTokenService;
import com.soa.gr6.lms.service.support.ClientIpResolver;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Người đọc xin quyền đọc và link có canary token cho một cuốn sách. */
@RestController
@RequestMapping("/api/v1/users/me/books/{bookId}")
public class ReadingAccessController {

    private final CanaryTokenService canaryTokenService;
    private final ClientIpResolver clientIpResolver;

    public ReadingAccessController(CanaryTokenService canaryTokenService, ClientIpResolver clientIpResolver) {
        this.canaryTokenService = canaryTokenService;
        this.clientIpResolver = clientIpResolver;
    }

    @GetMapping("/reading-access")
    public ReadingAccessResponse readingAccess(@PathVariable UUID bookId,
                                               @AuthenticationPrincipal AuthenticatedUser user) {
        return canaryTokenService.readingAccess(user.id(), bookId);
    }

    @PostMapping("/access")
    public CanaryLinkResponse requestAccess(@PathVariable UUID bookId,
                                            @Valid @RequestBody ReadingAccessRequest request,
                                            @AuthenticationPrincipal AuthenticatedUser user,
                                            HttpServletRequest httpRequest) {
        return canaryTokenService.issue(user.id(), bookId, request.purpose(), fingerprint(httpRequest));
    }

    private CanaryTokenService.ClientFingerprint fingerprint(HttpServletRequest request) {
        return new CanaryTokenService.ClientFingerprint(clientIpResolver.resolve(request), request.getHeader("User-Agent"));
    }
}
