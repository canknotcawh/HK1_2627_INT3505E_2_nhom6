package com.soa.gr6.lms.controller;

import com.soa.gr6.lms.service.CanaryTokenService;
import com.soa.gr6.lms.service.support.ClientIpResolver;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

/**
 * Endpoint public nhưng token là credential: không đọc được nếu chưa từng được cấp.
 * Không log token; không trả storage key.
 */
@RestController
@RequestMapping("/api/v1/reader/files")
public class ReaderFileController {

    private final CanaryTokenService canaryTokenService;
    private final ClientIpResolver clientIpResolver;

    public ReaderFileController(CanaryTokenService canaryTokenService, ClientIpResolver clientIpResolver) {
        this.canaryTokenService = canaryTokenService;
        this.clientIpResolver = clientIpResolver;
    }

    @GetMapping("/{token}")
    public ResponseEntity<InputStreamResource> stream(@PathVariable String token,
                                                      @RequestHeader(value = HttpHeaders.RANGE, required = false) String range,
                                                      HttpServletRequest request) {
        String requestId = UUID.randomUUID().toString();
        CanaryTokenService.ReaderPayload payload = canaryTokenService.open(
                token, fingerprint(request), range, requestId);

        String encoded = URLEncoder.encode(payload.fileName(), StandardCharsets.UTF_8).replace("+", "%20");
        HttpStatus status = payload.partial() ? HttpStatus.PARTIAL_CONTENT : HttpStatus.OK;

        ResponseEntity.BodyBuilder builder = ResponseEntity.status(status)
                .contentType(MediaType.APPLICATION_PDF)
                .contentLength(payload.length())
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename*=UTF-8''" + encoded)
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store, max-age=0")
                .header(HttpHeaders.PRAGMA, "no-cache")
                .header("Referrer-Policy", "no-referrer")
                .header("X-Content-Type-Options", "nosniff")
                .header("X-Robots-Tag", "noindex, nofollow, noarchive")
                .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                .header("Content-Security-Policy",
                        "frame-ancestors 'self' http://localhost:5173 http://localhost:5175");

        if (payload.partial()) {
            builder.header(HttpHeaders.CONTENT_RANGE,
                    "bytes " + payload.start() + "-" + (payload.start() + payload.length() - 1) + "/" + payload.totalSize());
        }
        return builder.body(new InputStreamResource(payload.stream()));
    }

    private CanaryTokenService.ClientFingerprint fingerprint(HttpServletRequest request) {
        return new CanaryTokenService.ClientFingerprint(clientIpResolver.resolve(request), request.getHeader("User-Agent"));
    }
}
