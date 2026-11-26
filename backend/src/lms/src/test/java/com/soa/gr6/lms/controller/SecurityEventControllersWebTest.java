package com.soa.gr6.lms.controller;

import com.soa.gr6.lms.controller.admin.AdminSecurityEventController;
import com.soa.gr6.lms.controller.user.SecurityEventController;
import com.soa.gr6.lms.domain.enums.SecurityEventSeverity;
import com.soa.gr6.lms.domain.enums.SecurityEventType;
import com.soa.gr6.lms.domain.enums.UserRole;
import com.soa.gr6.lms.dto.SecurityEventResponse;
import com.soa.gr6.lms.security.AuthenticatedUser;
import com.soa.gr6.lms.service.SecurityEventService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SecurityEventControllersWebTest {

    private final SecurityEventService securityEventService = mock(SecurityEventService.class);
    private MockMvc mockMvc;

    private final UUID testUserId = UUID.randomUUID();
    private final AuthenticatedUser testUser = new AuthenticatedUser(
            testUserId,
            "reader@uet.vnu.edu.vn",
            UserRole.USER
    );

    @BeforeEach
    void setUp() {
        SecurityEventController userController = new SecurityEventController(securityEventService);
        AdminSecurityEventController adminController = new AdminSecurityEventController(securityEventService);

        mockMvc = MockMvcBuilders
                .standaloneSetup(userController, adminController)
                .setCustomArgumentResolvers(
                        new AuthenticationPrincipalArgumentResolver(),
                        new PageableHandlerMethodArgumentResolver()
                )
                .build();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void testReportEvent_authenticatedUser() throws Exception {
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(testUser, "N/A", List.of())
        );

        UUID bookId = UUID.randomUUID();
        SecurityEventResponse response = new SecurityEventResponse(
                UUID.randomUUID(),
                testUserId,
                "reader@uet.vnu.edu.vn",
                SecurityEventType.WATERMARK_TAMPERED,
                SecurityEventSeverity.CRITICAL,
                "/books/" + bookId,
                bookId,
                "Clean Code",
                "Watermark hidden via DevTools",
                "10.0.0.5",
                "Chrome/120",
                Instant.now()
        );
        when(securityEventService.recordEvent(eq(testUserId), eq("reader@uet.vnu.edu.vn"), any(), eq("10.0.0.5"), eq("Chrome/120")))
                .thenReturn(response);

        String body = """
                {
                  "eventType": "WATERMARK_TAMPERED",
                  "severity": "CRITICAL",
                  "pageUrl": "/books/%s",
                  "bookId": "%s",
                  "bookTitle": "Clean Code",
                  "details": "Watermark hidden via DevTools"
                }
                """.formatted(bookId, bookId);

        mockMvc.perform(post("/api/v1/security-events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("User-Agent", "Chrome/120")
                        .with(req -> {
                            req.setRemoteAddr("10.0.0.5");
                            return req;
                        })
                        .content(body))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.eventType").value("WATERMARK_TAMPERED"))
                .andExpect(jsonPath("$.severity").value("CRITICAL"))
                .andExpect(jsonPath("$.userEmail").value("reader@uet.vnu.edu.vn"));

        verify(securityEventService).recordEvent(eq(testUserId), eq("reader@uet.vnu.edu.vn"), any(), eq("10.0.0.5"), eq("Chrome/120"));
    }

    @Test
    void testAdminListEvents() throws Exception {
        SecurityEventResponse item = new SecurityEventResponse(
                UUID.randomUUID(),
                testUserId,
                "reader@uet.vnu.edu.vn",
                SecurityEventType.SHORTCUT_BLOCKED,
                SecurityEventSeverity.MEDIUM,
                "/books/123",
                null,
                null,
                "Blocked F12",
                "192.168.1.10",
                "Edge/120",
                Instant.now()
        );
        when(securityEventService.listEvents(eq(SecurityEventType.SHORTCUT_BLOCKED), isNull(), isNull(), any()))
                .thenReturn(new PageImpl<>(List.of(item), PageRequest.of(0, 20), 1));

        mockMvc.perform(get("/api/v1/admin/security-events")
                        .param("eventType", "SHORTCUT_BLOCKED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].eventType").value("SHORTCUT_BLOCKED"))
                .andExpect(jsonPath("$.content[0].details").value("Blocked F12"));
    }
}

