package com.soa.gr6.lms.controller.publicapi;

import java.time.Duration;
import java.util.UUID;

import com.soa.gr6.lms.security.AuthenticatedUser;
import com.soa.gr6.lms.service.PreviewService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.ResponseCookie;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
public class PreviewController {
    private final PreviewService previews;

    public PreviewController(PreviewService previews) {
        this.previews = previews;
    }

    public record Request(@NotNull UUID tab, @NotNull PreviewService.Action action) {}

    @PostMapping("/api/v1/users/me/preview/claim")
    public void claim(@AuthenticationPrincipal AuthenticatedUser user,
            @CookieValue(name="preview_guest", required=false) UUID guest) {
        previews.claim(user.id(), guest);
    }

    @PostMapping("/api/v1/public/books/{book}/preview")
    public PreviewService.Access access(@PathVariable UUID book, @Valid @RequestBody Request body,
            @CookieValue(name="preview_guest", required=false) UUID guest,
            @AuthenticationPrincipal AuthenticatedUser user, HttpServletRequest request, HttpServletResponse response) {
        if (guest == null && user == null) {
            // A browser blocking cookies must not receive a fresh budget on every renewal.
            if (body.action() != PreviewService.Action.STATUS) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Guest preview requires cookies");
            }
            guest = UUID.randomUUID();
            response.addHeader("Set-Cookie", ResponseCookie.from("preview_guest", guest.toString())
                    .path("/api/v1").httpOnly(true).secure(request.isSecure())
                    .sameSite(request.isSecure() ? "None" : "Lax").maxAge(Duration.ofDays(365)).build().toString());
        }
        response.setHeader("Cache-Control", "no-store");
        return previews.access(book, user == null ? null : user.id(), guest, body.tab(), body.action());
    }
}
