package com.soa.gr6.lms.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.soa.gr6.lms.controller.user.ReadingAccessController;
import com.soa.gr6.lms.domain.enums.UserRole;
import com.soa.gr6.lms.exception.ApiException;
import com.soa.gr6.lms.exception.ErrorCode;
import com.soa.gr6.lms.exception.GlobalExceptionHandler;
import com.soa.gr6.lms.security.AuthenticatedUser;
import com.soa.gr6.lms.service.CanaryTokenService;
import com.soa.gr6.lms.service.support.ClientIpResolver;

/** Vượt hạn mức phải trả 429 thay vì 500 hay 403. */
class RateLimitControllersWebTest {

    private final CanaryTokenService service = mock(CanaryTokenService.class);
    private final UUID userId = UUID.randomUUID();
    private final UUID bookId = UUID.randomUUID();

    private MockMvc readingAccessMvc;
    private MockMvc readerFileMvc;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        new AuthenticatedUser(userId, "reader@example.com", UserRole.USER), null, List.of()));
        readingAccessMvc = MockMvcBuilders
                .standaloneSetup(new ReadingAccessController(service, new ClientIpResolver(true)))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .build();
        readerFileMvc = MockMvcBuilders
                .standaloneSetup(new ReaderFileController(service, new ClientIpResolver(true)))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void issuingTooManyLinksReturns429() throws Exception {
        when(service.issue(eq(userId), eq(bookId), any(), any()))
                .thenThrow(new ApiException(ErrorCode.RATE_LIMITED));

        readingAccessMvc.perform(post("/api/v1/users/me/books/{bookId}/access", bookId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"purpose\":\"READ\"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("RATE_LIMITED"));
    }

    @Test
    void streamingTooOftenReturns429() throws Exception {
        when(service.open(any(), any(), any(), any()))
                .thenThrow(new ApiException(ErrorCode.RATE_LIMITED));

        readerFileMvc.perform(get("/api/v1/reader/files/{token}", "cnr_abcdefghijklmnopqrstuv"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("RATE_LIMITED"));
    }
}
