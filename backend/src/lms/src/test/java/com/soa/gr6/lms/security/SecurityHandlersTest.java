package com.soa.gr6.lms.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.web.servlet.HandlerExceptionResolver;

import com.soa.gr6.lms.exception.ApiException;
import com.soa.gr6.lms.exception.ErrorCode;

class SecurityHandlersTest {
    private final HandlerExceptionResolver resolver = mock(HandlerExceptionResolver.class);
    private final MockHttpServletRequest request = new MockHttpServletRequest();
    private final MockHttpServletResponse response = new MockHttpServletResponse();

    private ErrorCode resolvedCode() {
        ArgumentCaptor<Exception> captor = ArgumentCaptor.forClass(Exception.class);
        verify(resolver).resolveException(any(), any(), isNull(), captor.capture());
        return ((ApiException) captor.getValue()).getErrorCode();
    }

    @Test
    void missingOrBadTokenYields401WithBearerChallenge() {
        new RestAuthenticationEntryPoint(resolver).commence(request, response, new BadCredentialsException("x"));
        assertThat(resolvedCode()).isEqualTo(ErrorCode.UNAUTHORIZED);
        assertThat(response.getHeader("WWW-Authenticate")).isEqualTo("Bearer");
    }

    @Test
    void suspendedAccountYieldsAccountDisabled() {
        new RestAuthenticationEntryPoint(resolver).commence(request, response, new DisabledException("suspended"));
        assertThat(resolvedCode()).isEqualTo(ErrorCode.ACCOUNT_DISABLED);
    }

    @Test
    void accessDeniedYieldsForbidden() {
        new RestAccessDeniedHandler(resolver).handle(request, response, new AccessDeniedException("no"));
        assertThat(resolvedCode()).isEqualTo(ErrorCode.FORBIDDEN);
    }

    @Test
    void corsAllowsPatchForAdminBookEndpoint() {
        var source = new SecurityConfig().corsConfigurationSource(java.util.List.of("http://localhost:5173"));
        var req = new MockHttpServletRequest("OPTIONS", "/api/v1/admin/books/1/copies");
        var config = ((org.springframework.web.cors.UrlBasedCorsConfigurationSource) source).getCorsConfiguration(req);
        assertThat(config).isNotNull();
        assertThat(config.getAllowedMethods()).contains("PATCH");
        assertThat(config.getAllowedOrigins()).containsExactly("http://localhost:5173");
    }
}
