package com.soa.gr6.lms.controller.admin;

import com.soa.gr6.lms.domain.enums.BookFileKind;
import com.soa.gr6.lms.dto.BookFileResponse;
import com.soa.gr6.lms.security.AuthenticatedUser;
import com.soa.gr6.lms.service.BookFileService;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

/**
 * Quản lý file PDF gốc của sách (ADMIN). File không bao giờ public: admin tải nội dung
 * qua endpoint này để kiểm tra bản đã upload.
 */
@RestController
@RequestMapping("/api/v1/admin/books/{bookId}/files")
public class AdminBookFileController {

    private final BookFileService bookFileService;

    public AdminBookFileController(BookFileService bookFileService) {
        this.bookFileService = bookFileService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BookFileResponse upload(@PathVariable UUID bookId,
                                   @RequestParam("kind") BookFileKind kind,
                                   @RequestParam("file") MultipartFile file,
                                   @AuthenticationPrincipal AuthenticatedUser admin) {
        return bookFileService.upload(bookId, kind, file, admin == null ? null : admin.id());
    }

    @GetMapping
    public List<BookFileResponse> list(@PathVariable UUID bookId) {
        return bookFileService.list(bookId);
    }

    @DeleteMapping("/{fileId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void archive(@PathVariable UUID bookId, @PathVariable UUID fileId) {
        bookFileService.archive(bookId, fileId);
    }

    @GetMapping("/{fileId}/content")
    public ResponseEntity<InputStreamResource> content(@PathVariable UUID bookId, @PathVariable UUID fileId) {
        BookFileService.StoredBookFile file = bookFileService.download(bookId, fileId);
        String encoded = URLEncoder.encode(file.fileName(), StandardCharsets.UTF_8).replace("+", "%20");
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .contentLength(file.sizeBytes())
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename*=UTF-8''" + encoded)
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store, max-age=0")
                .header("Pragma", "no-cache")
                .header("Referrer-Policy", "no-referrer")
                .header("X-Content-Type-Options", "nosniff")
                .header("X-Robots-Tag", "noindex, nofollow, noarchive")
                .body(new InputStreamResource(file.stream()));
    }
}
