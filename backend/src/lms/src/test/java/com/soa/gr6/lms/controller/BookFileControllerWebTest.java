package com.soa.gr6.lms.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.ByteArrayInputStream;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.soa.gr6.lms.controller.admin.AdminBookFileController;
import com.soa.gr6.lms.domain.enums.BookFileKind;
import com.soa.gr6.lms.domain.enums.UserRole;
import com.soa.gr6.lms.dto.BookFileResponse;
import com.soa.gr6.lms.exception.BookNotFoundException;
import com.soa.gr6.lms.exception.GlobalExceptionHandler;
import com.soa.gr6.lms.security.AuthenticatedUser;
import com.soa.gr6.lms.service.BookFileService;

class BookFileControllerWebTest {

    private final BookFileService service = mock(BookFileService.class);

    private final UUID adminId = UUID.randomUUID();
    private final UUID bookId = UUID.randomUUID();
    private final UUID fileId = UUID.randomUUID();

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        new AuthenticatedUser(adminId, "admin@lms.local", UserRole.ADMIN), null, List.of()));
        mvc = MockMvcBuilders
                .standaloneSetup(new AdminBookFileController(service))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .build();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private BookFileResponse file() {
        return new BookFileResponse(fileId, BookFileKind.FULL, "clean-code.pdf", "application/pdf",
                1024, 3, "a".repeat(64), "ACTIVE", Instant.parse("2026-01-01T00:00:00Z"), null);
    }

    @Test
    void uploadReturnsCreatedFileWithoutStorageKey() throws Exception {
        when(service.upload(eq(bookId), eq(BookFileKind.FULL), any(), eq(adminId))).thenReturn(file());

        mvc.perform(multipart("/api/v1/admin/books/{bookId}/files", bookId)
                        .file(new MockMultipartFile("file", "clean-code.pdf", "application/pdf", new byte[]{1, 2}))
                        .param("kind", "FULL"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(fileId.toString()))
                .andExpect(jsonPath("$.kind").value("FULL"))
                .andExpect(jsonPath("$.pageCount").value(3))
                .andExpect(jsonPath("$.storageKey").doesNotExist());
    }

    @Test
    void uploadReportsMissingBook() throws Exception {
        when(service.upload(eq(bookId), eq(BookFileKind.PREVIEW), any(), any()))
                .thenThrow(new BookNotFoundException(bookId));

        mvc.perform(multipart("/api/v1/admin/books/{bookId}/files", bookId)
                        .file(new MockMultipartFile("file", "a.pdf", "application/pdf", new byte[]{1}))
                        .param("kind", "PREVIEW"))
                .andExpect(status().isNotFound());
    }

    @Test
    void listReturnsFilesOfBook() throws Exception {
        when(service.list(bookId)).thenReturn(List.of(file()));

        mvc.perform(get("/api/v1/admin/books/{bookId}/files", bookId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].originalName").value("clean-code.pdf"));
    }

    @Test
    void archiveReturnsNoContent() throws Exception {
        mvc.perform(delete("/api/v1/admin/books/{bookId}/files/{fileId}", bookId, fileId))
                .andExpect(status().isNoContent());

        verify(service).archive(bookId, fileId);
    }

    @Test
    void contentStreamsPdfWithNoStoreHeaders() throws Exception {
        when(service.download(bookId, fileId)).thenReturn(new BookFileService.StoredBookFile(
                "clean-code.pdf", "application/pdf", 4L, new ByteArrayInputStream("%PDF".getBytes())));

        mvc.perform(get("/api/v1/admin/books/{bookId}/files/{fileId}/content", bookId, fileId))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "private, no-store, max-age=0"))
                .andExpect(header().string("X-Robots-Tag", "noindex, nofollow, noarchive"))
                .andExpect(header().string("Content-Type", MediaType.APPLICATION_PDF_VALUE));
    }
}
