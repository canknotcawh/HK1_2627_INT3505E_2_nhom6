package com.soa.gr6.lms.controller;

import com.soa.gr6.lms.controller.admin.AdminBookController;
import com.soa.gr6.lms.controller.admin.AdminBookReviewController;
import com.soa.gr6.lms.controller.admin.AdminCategoryController;
import com.soa.gr6.lms.controller.admin.AdminStatsController;
import com.soa.gr6.lms.controller.identity.AuthController;
import com.soa.gr6.lms.controller.identity.EmailVerificationController;
import com.soa.gr6.lms.controller.user.BookReviewController;
import com.soa.gr6.lms.controller.publicapi.PublicBookController;
import com.soa.gr6.lms.domain.enums.UserRole;
import com.soa.gr6.lms.dto.AdminStatsResponse;
import com.soa.gr6.lms.dto.AuthResponse;
import com.soa.gr6.lms.dto.BookResponse;
import com.soa.gr6.lms.dto.CategoryResponse;
import com.soa.gr6.lms.dto.ReviewEligibilityResponse;
import com.soa.gr6.lms.dto.ReviewResponse;
import com.soa.gr6.lms.dto.UserResponse;
import com.soa.gr6.lms.exception.GlobalExceptionHandler;
import com.soa.gr6.lms.security.AuthenticatedUser;
import com.soa.gr6.lms.service.AdminStatsService;
import com.soa.gr6.lms.service.BookReviewService;
import com.soa.gr6.lms.service.BookService;
import com.soa.gr6.lms.service.CategoryService;
import com.soa.gr6.lms.service.identity.AuthService;
import com.soa.gr6.lms.service.identity.EmailVerificationService;
import com.soa.gr6.lms.service.identity.PasswordManagementService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class MissingControllerRoutesWebTest {
    private final UUID userId = UUID.randomUUID();
    private final UUID bookId = UUID.randomUUID();
    private final UUID categoryId = UUID.randomUUID();
    private final UUID targetCategoryId = UUID.randomUUID();
    private final UUID reviewId = UUID.randomUUID();

    private final BookService bookService = mock(BookService.class);
    private final BookReviewService bookReviewService = mock(BookReviewService.class);
    private final CategoryService categoryService = mock(CategoryService.class);
    private final AdminStatsService adminStatsService = mock(AdminStatsService.class);
    private final AuthService authService = mock(AuthService.class);
    private final PasswordManagementService passwordManagementService = mock(PasswordManagementService.class);
    private final EmailVerificationService emailVerificationService = mock(EmailVerificationService.class);

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.getContext().setAuthentication(UsernamePasswordAuthenticationToken.authenticated(
                new AuthenticatedUser(userId, "reader@example.test", UserRole.USER), "n/a", List.of()));
        mvc = MockMvcBuilders.standaloneSetup(
                        new AdminBookController(bookService),
                        new AdminBookReviewController(bookReviewService),
                        new AdminCategoryController(categoryService),
                        new AdminStatsController(adminStatsService),
                        new AuthController(authService, passwordManagementService),
                        new EmailVerificationController(emailVerificationService),
                        new BookReviewController(bookReviewService),
                        new PublicBookController(bookService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(
                        new PageableHandlerMethodArgumentResolver(), new AuthenticationPrincipalArgumentResolver())
                .build();
    }

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    private BookResponse book() {
        return new BookResponse(bookId, "9780306406157", "Test Book", null, null, "en", 2020,
                100, null, 2, 2, "ACTIVE", Instant.now(), Instant.now());
    }

    private ReviewResponse review() {
        return new ReviewResponse(reviewId, bookId, userId, "Reader", 5, "Helpful review", "VISIBLE",
                Instant.now(), Instant.now());
    }

    private static <T> PageImpl<T> page(T item) {
        return new PageImpl<>(List.of(item), PageRequest.of(0, 20), 1);
    }

    @Test
    void adminBookListReturnsPageBody() throws Exception {
        when(bookService.listAdminBooks(eq("test"), any(Pageable.class))).thenReturn(page(book()));

        mvc.perform(get("/api/v1/admin/books").param("q", "test"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].title").value("Test Book"));
    }

    @Test
    void publicCategoryListReturnsNames() throws Exception {
        when(bookService.getCategories()).thenReturn(List.of("Fiction", "Science"));

        mvc.perform(get("/api/v1/public/books/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0]").value("Fiction"))
                .andExpect(jsonPath("$[1]").value("Science"));
    }

    @Test
    void adminCategoryListReturnsCounts() throws Exception {
        when(categoryService.list()).thenReturn(List.of(new CategoryResponse(categoryId, "Fiction", 3)));

        mvc.perform(get("/api/v1/admin/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Fiction"))
                .andExpect(jsonPath("$[0].bookCount").value(3));
    }

    @Test
    void createAdminCategoryReturns201() throws Exception {
        when(categoryService.create("Fiction")).thenReturn(new CategoryResponse(categoryId, "Fiction", 0));

        mvc.perform(post("/api/v1/admin/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Fiction\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(categoryId.toString()))
                .andExpect(jsonPath("$.name").value("Fiction"));
    }

    @Test
    void renameAdminCategoryReturnsUpdatedCategory() throws Exception {
        when(categoryService.rename(categoryId, "Literature"))
                .thenReturn(new CategoryResponse(categoryId, "Literature", 2));

        mvc.perform(put("/api/v1/admin/categories/{id}", categoryId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Literature\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Literature"))
                .andExpect(jsonPath("$.bookCount").value(2));
    }

    @Test
    void deleteAdminCategoryReturns204() throws Exception {
        mvc.perform(delete("/api/v1/admin/categories/{id}", categoryId))
                .andExpect(status().isNoContent());

        verify(categoryService).delete(categoryId);
    }

    @Test
    void mergeAdminCategoriesReturnsTargetCategory() throws Exception {
        when(categoryService.merge(categoryId, targetCategoryId))
                .thenReturn(new CategoryResponse(targetCategoryId, "Fiction", 5));

        mvc.perform(post("/api/v1/admin/categories/{id}/merge", categoryId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"targetId\":\"" + targetCategoryId + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(targetCategoryId.toString()))
                .andExpect(jsonPath("$.bookCount").value(5));
    }

    @Test
    void adminReviewListReturnsPageBody() throws Exception {
        when(bookReviewService.listAllReviewsForAdmin(any(Pageable.class))).thenReturn(page(review()));

        mvc.perform(get("/api/v1/admin/reviews"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(reviewId.toString()))
                .andExpect(jsonPath("$.content[0].rating").value(5));
    }

    @Test
    void adminStatsOverviewReturnsSummary() throws Exception {
        AdminStatsResponse stats = new AdminStatsResponse(
                10, 2, 25, 40, 30,
                Map.of("ACTIVE", 4L),
                List.of(new AdminStatsResponse.DailyLoans(LocalDate.of(2026, 11, 18), 3, 2)),
                List.of(new AdminStatsResponse.NamedCount("Fiction", 8)),
                List.of(new AdminStatsResponse.NamedCount("Test Book", 4)));
        when(adminStatsService.overview()).thenReturn(stats);

        mvc.perform(get("/api/v1/admin/stats/overview"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalUsers").value(10))
                .andExpect(jsonPath("$.activeBooks").value(25))
                .andExpect(jsonPath("$.topCategories[0].name").value("Fiction"));
    }

    @Test
    void listMyReviewsReturnsPageBody() throws Exception {
        when(bookReviewService.listUserReviews(eq(userId), any(Pageable.class))).thenReturn(page(review()));

        mvc.perform(get("/api/v1/users/me/reviews"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(reviewId.toString()));
    }

    @Test
    void confirmEmailVerificationReturnsMessage() throws Exception {
        mvc.perform(post("/api/v1/public/auth/email-verification/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"reader@example.test\",\"code\":\"123456\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Email verified. You can sign in now."));

        verify(emailVerificationService).confirm("reader@example.test", "123456", null);
    }

    @Test
    void resendEmailVerificationReturnsGenericMessage() throws Exception {
        mvc.perform(post("/api/v1/public/auth/email-verification/resend")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"reader@example.test\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value(
                        "If the account is eligible, verification instructions will be sent."));

        verify(emailVerificationService).resend("reader@example.test");
    }

    @Test
    void googleLoginReturnsAuthResponse() throws Exception {
        when(authService.loginWithGoogle("google-id-token"))
                .thenReturn(new AuthResponse("access", "refresh",
                        new UserResponse(userId, "Reader", "reader@example.test", UserRole.USER)));

        mvc.perform(post("/api/v1/public/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"google-id-token\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("access"))
                .andExpect(jsonPath("$.user.email").value("reader@example.test"));
    }
}
