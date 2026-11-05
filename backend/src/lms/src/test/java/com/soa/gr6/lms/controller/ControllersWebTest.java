package com.soa.gr6.lms.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

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

import com.soa.gr6.lms.controller.publicapi.PublicBookController;
import com.soa.gr6.lms.controller.admin.AdminBookController;
import com.soa.gr6.lms.controller.admin.AdminLoanController;
import com.soa.gr6.lms.controller.admin.AdminUserController;
import com.soa.gr6.lms.controller.identity.AuthController;
import com.soa.gr6.lms.controller.identity.UserController;
import com.soa.gr6.lms.domain.enums.UserRole;
import com.soa.gr6.lms.domain.enums.UserStatus;
import com.soa.gr6.lms.dto.AdminUserResponse;
import com.soa.gr6.lms.dto.AuthResponse;
import com.soa.gr6.lms.dto.BookResponse;
import com.soa.gr6.lms.dto.LoanResponse;
import com.soa.gr6.lms.dto.UserResponse;
import com.soa.gr6.lms.exception.BookNotFoundException;
import com.soa.gr6.lms.exception.BookUnavailableException;
import com.soa.gr6.lms.exception.DuplicateResourceException;
import com.soa.gr6.lms.exception.GlobalExceptionHandler;
import com.soa.gr6.lms.exception.LoanNotFoundException;
import com.soa.gr6.lms.exception.UserSuspendedException;
import com.soa.gr6.lms.security.AuthenticatedUser;
import com.soa.gr6.lms.service.AdminUserService;
import com.soa.gr6.lms.service.BookService;
import com.soa.gr6.lms.service.LoanService;
import com.soa.gr6.lms.service.identity.AuthService;
import com.soa.gr6.lms.service.identity.UserService;

class ControllersWebTest {
    private final BookService bookService = mock(BookService.class);
    private final LoanService loanService = mock(LoanService.class);
    private final AdminUserService adminUserService = mock(AdminUserService.class);
    private final UserService userService = mock(UserService.class);
    private final AuthService authService = mock(AuthService.class);

    private final UUID userId = UUID.randomUUID();
    private final UUID bookId = UUID.randomUUID();
    private final UUID loanId = UUID.randomUUID();

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.getContext().setAuthentication(UsernamePasswordAuthenticationToken.authenticated(
                new AuthenticatedUser(userId, "a@b.com", UserRole.USER), "n/a", List.of()));
        mvc = MockMvcBuilders.standaloneSetup(
                        new PublicBookController(bookService),
                        new AdminBookController(bookService),
                        new AdminLoanController(loanService),
                        new AdminUserController(adminUserService),
                        new UserController(userService, loanService),
                        new AuthController(authService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(
                        new PageableHandlerMethodArgumentResolver(), new AuthenticationPrincipalArgumentResolver())
                .build();
    }

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    @SafeVarargs
    private static <T> PageImpl<T> paged(T... items) {
        return new PageImpl<>(List.of(items), PageRequest.of(0, 20), items.length);
    }

    private BookResponse book() {
        return new BookResponse(bookId, null, "Clean Code", null, null, "en", 2008, 464, null,
                3, 3, "ACTIVE", Instant.now(), Instant.now());
    }

    private LoanResponse loan(UUID owner) {
        return new LoanResponse(loanId, bookId, "Clean Code", owner, "a@b.com", "A", Instant.now(),
                Instant.now().plusSeconds(60), null, "ACTIVE", 0);
    }

    private AdminUserResponse adminUser() {
        return new AdminUserResponse(userId, "a@b.com", "A", UserRole.USER, UserStatus.ACTIVE, Instant.now(), Instant.now());
    }

    private static final String BOOK_JSON = "{\"title\":\"Clean Code\",\"totalCopies\":3}";

    // ---- public catalogue ----

    @Test
    void publicSearchAndDetail() throws Exception {
        when(bookService.searchBooks(eq("clean"), any())).thenReturn(paged(book()));
        when(bookService.getBook(bookId)).thenReturn(book());

        mvc.perform(get("/api/v1/public/books").param("q", "clean"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].title").value("Clean Code"));
        mvc.perform(get("/api/v1/public/books/{id}", bookId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.availableCopies").value(3));
    }

    @Test
    void unknownBookIsNotFound() throws Exception {
        when(bookService.getBook(bookId)).thenThrow(new BookNotFoundException(bookId));
        mvc.perform(get("/api/v1/public/books/{id}", bookId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("BOOK_NOT_FOUND"));
    }

    // ---- admin books ----

    @Test
    void adminBookCrud() throws Exception {
        when(bookService.createBook(any())).thenReturn(book());
        when(bookService.updateBook(eq(bookId), any())).thenReturn(book());
        when(bookService.updateCopyCounts(bookId, 5, 4)).thenReturn(book());
        when(bookService.retireBook(bookId)).thenReturn(book());
        when(bookService.activateBook(bookId)).thenReturn(book());

        mvc.perform(post("/api/v1/admin/books").contentType(MediaType.APPLICATION_JSON).content(BOOK_JSON))
                .andExpect(status().isCreated());
        mvc.perform(put("/api/v1/admin/books/{id}", bookId).contentType(MediaType.APPLICATION_JSON).content(BOOK_JSON))
                .andExpect(status().isOk());
        mvc.perform(patch("/api/v1/admin/books/{id}/copies", bookId).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"totalCopies\":5,\"availableCopies\":4}"))
                .andExpect(status().isOk());
        mvc.perform(post("/api/v1/admin/books/{id}/retire", bookId)).andExpect(status().isOk());
        mvc.perform(post("/api/v1/admin/books/{id}/activate", bookId)).andExpect(status().isOk());
    }

    @Test
    void invalidBookPayloadIsRejectedWithFieldErrors() throws Exception {
        mvc.perform(post("/api/v1/admin/books").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\" \",\"totalCopies\":-1}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.fieldErrors.title").exists())
                .andExpect(jsonPath("$.fieldErrors.totalCopies").exists());
    }

    @Test
    void malformedJsonIsBadRequest() throws Exception {
        mvc.perform(post("/api/v1/admin/books").contentType(MediaType.APPLICATION_JSON).content("{nope"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    @Test
    void duplicateIsbnIsConflict() throws Exception {
        when(bookService.createBook(any()))
                .thenThrow(new DuplicateResourceException("ISBN13_ALREADY_EXISTS", "dup"));
        mvc.perform(post("/api/v1/admin/books").contentType(MediaType.APPLICATION_JSON).content(BOOK_JSON))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ISBN13_ALREADY_EXISTS"));
    }

    // ---- admin loans ----

    @Test
    void adminLoanOperations() throws Exception {
        when(loanService.getLoan(loanId)).thenReturn(loan(userId));
        when(loanService.listUserLoans(eq(userId), any(), any())).thenReturn(paged(loan(userId)));
        when(loanService.listLoans(any(), any())).thenReturn(paged(loan(userId)));
        when(loanService.returnBook(loanId)).thenReturn(loan(userId));
        when(loanService.rejectReturnRequest(loanId)).thenReturn(loan(userId));
        when(loanService.markLost(loanId)).thenReturn(loan(userId));
        when(loanService.recoverLostLoan(loanId)).thenReturn(loan(userId));
        when(loanService.markOverdueLoans()).thenReturn(2);

        mvc.perform(get("/api/v1/admin/loans").param("status", "PENDING_RETURN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].bookTitle").value("Clean Code"));
        mvc.perform(get("/api/v1/admin/loans/{id}", loanId)).andExpect(status().isOk());
        mvc.perform(get("/api/v1/admin/users/{id}/loans", userId).param("status", "ACTIVE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].bookTitle").value("Clean Code"));
        mvc.perform(post("/api/v1/admin/loans/{id}/return", loanId)).andExpect(status().isOk());
        mvc.perform(post("/api/v1/admin/loans/{id}/reject-return", loanId)).andExpect(status().isOk());
        mvc.perform(post("/api/v1/admin/loans/{id}/lost", loanId)).andExpect(status().isOk());
        mvc.perform(post("/api/v1/admin/loans/{id}/recover", loanId)).andExpect(status().isOk());
        mvc.perform(post("/api/v1/admin/loans/mark-overdue"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.updated").value(2));
    }

    // ---- admin users ----

    @Test
    void adminUserManagement() throws Exception {
        when(adminUserService.searchUsers(any(), any(), any(), any())).thenReturn(paged(adminUser()));
        when(adminUserService.getUser(userId)).thenReturn(adminUser());
        when(adminUserService.suspendUser(userId, userId)).thenReturn(adminUser());
        when(adminUserService.reactivateUser(userId)).thenReturn(adminUser());
        when(adminUserService.promoteToAdmin(userId)).thenReturn(adminUser());
        when(adminUserService.demoteToUser(userId, userId)).thenReturn(adminUser());

        mvc.perform(get("/api/v1/admin/users").param("q", "a").param("status", "ACTIVE").param("role", "USER"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].email").value("a@b.com"));
        mvc.perform(get("/api/v1/admin/users/{id}", userId)).andExpect(status().isOk());
        mvc.perform(post("/api/v1/admin/users/{id}/suspend", userId)).andExpect(status().isOk());
        mvc.perform(post("/api/v1/admin/users/{id}/reactivate", userId)).andExpect(status().isOk());
        mvc.perform(post("/api/v1/admin/users/{id}/promote", userId)).andExpect(status().isOk());
        mvc.perform(post("/api/v1/admin/users/{id}/demote", userId)).andExpect(status().isOk());
    }

    // ---- current user ----

    @Test
    void meReturnsProfile() throws Exception {
        when(userService.getCurrentUser(userId))
                .thenReturn(new UserResponse(userId, "A", "a@b.com", UserRole.USER));
        mvc.perform(get("/api/v1/users/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("a@b.com"));
    }

    @Test
    void borrowListReturnRenew() throws Exception {
        when(loanService.listUserLoans(eq(userId), any(), any())).thenReturn(paged(loan(userId)));
        when(loanService.borrowBook(userId, bookId)).thenReturn(loan(userId));
        when(loanService.getLoan(loanId)).thenReturn(loan(userId));
        when(loanService.requestReturn(loanId)).thenReturn(loan(userId));
        when(loanService.renewLoan(loanId)).thenReturn(loan(userId));

        mvc.perform(get("/api/v1/users/me/loans")).andExpect(status().isOk());
        mvc.perform(post("/api/v1/users/me/loans").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bookId\":\"" + bookId + "\"}"))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/v1/users/me/loans/{id}/return", loanId)).andExpect(status().isOk());
        mvc.perform(post("/api/v1/users/me/loans/{id}/renew", loanId)).andExpect(status().isOk());
    }

    @Test
    void borrowWithoutBookIdIsRejected() throws Exception {
        mvc.perform(post("/api/v1/users/me/loans").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void userCannotTouchSomeoneElsesLoan() throws Exception {
        when(loanService.getLoan(loanId)).thenReturn(loan(UUID.randomUUID()));
        mvc.perform(post("/api/v1/users/me/loans/{id}/return", loanId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("LOAN_NOT_FOUND"));
        mvc.perform(post("/api/v1/users/me/loans/{id}/renew", loanId)).andExpect(status().isNotFound());
    }

    @Test
    void domainErrorsMapToHttpStatuses() throws Exception {
        when(loanService.borrowBook(userId, bookId)).thenThrow(BookUnavailableException.noCopies());
        mvc.perform(post("/api/v1/users/me/loans").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bookId\":\"" + bookId + "\"}"))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("NO_COPIES_AVAILABLE"));

        org.mockito.Mockito.doThrow(new UserSuspendedException()).when(loanService).borrowBook(userId, bookId);
        mvc.perform(post("/api/v1/users/me/loans").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bookId\":\"" + bookId + "\"}"))
                .andExpect(status().isForbidden());

        org.mockito.Mockito.doThrow(new LoanNotFoundException(loanId)).when(loanService).getLoan(loanId);
        mvc.perform(post("/api/v1/users/me/loans/{id}/return", loanId)).andExpect(status().isNotFound());
    }

    // ---- password auth ----

    @Test
    void registerAndLoginWithPassword() throws Exception {
        AuthResponse authResponse = new AuthResponse("access", "refresh",
                new UserResponse(userId, "A", "a@b.com", UserRole.USER));
        when(authService.register("a@b.com", "secret123", "A")).thenReturn(authResponse);
        when(authService.loginWithPassword("a@b.com", "secret123")).thenReturn(authResponse);

        mvc.perform(post("/api/v1/public/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"a@b.com\",\"password\":\"secret123\",\"fullName\":\"A\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("access"));

        mvc.perform(post("/api/v1/public/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"a@b.com\",\"password\":\"secret123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("access"));
    }

    @Test
    void registerRejectsShortPassword() throws Exception {
        mvc.perform(post("/api/v1/public/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"a@b.com\",\"password\":\"short\",\"fullName\":\"A\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void duplicateEmailRegistrationIsConflict() throws Exception {
        when(authService.register(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any()))
                .thenThrow(new DuplicateResourceException("EMAIL_ALREADY_REGISTERED", "dup"));

        mvc.perform(post("/api/v1/public/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"a@b.com\",\"password\":\"secret123\",\"fullName\":\"A\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("EMAIL_ALREADY_REGISTERED"));
    }
}
