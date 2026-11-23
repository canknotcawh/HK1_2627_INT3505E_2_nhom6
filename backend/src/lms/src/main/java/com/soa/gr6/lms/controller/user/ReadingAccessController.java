package com.soa.gr6.lms.controller.user;

import com.soa.gr6.lms.dto.CanaryLinkResponse;
import com.soa.gr6.lms.dto.ReadingAccessRequest;
import com.soa.gr6.lms.dto.ReadingAccessResponse;
import com.soa.gr6.lms.security.AuthenticatedUser;
import com.soa.gr6.lms.service.CanaryTokenService;
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

    public ReadingAccessController(CanaryTokenService canaryTokenService) {
        this.canaryTokenService = canaryTokenService;
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

    private static CanaryTokenService.ClientFingerprint fingerprint(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        String ip = forwarded == null || forwarded.isBlank()
                ? request.getRemoteAddr()
                : forwarded.split(",")[0].trim();
        return new CanaryTokenService.ClientFingerprint(ip, request.getHeader("User-Agent"));
    }
}
