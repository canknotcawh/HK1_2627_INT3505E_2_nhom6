package com.soa.gr6.lms.controller;

import java.util.UUID;
import com.soa.gr6.lms.controller.publicapi.PreviewController;
import com.soa.gr6.lms.service.PreviewService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PreviewControllerTest {
    @Test
    void guestMustReturnCookieBeforeReading() {
        PreviewService service = mock(PreviewService.class);
        PreviewController controller = new PreviewController(service);
        var response = new MockHttpServletResponse();
        var request = new MockHttpServletRequest();
        UUID book = UUID.randomUUID(), tab = UUID.randomUUID();
        var read = new PreviewController.Request(tab, PreviewService.Action.READ);
        var error = assertThrows(ResponseStatusException.class,
                () -> controller.access(book, read, null, null, request, response));
        assertEquals(HttpStatus.FORBIDDEN, error.getStatusCode());
        verifyNoInteractions(service);

        var status = new PreviewController.Request(tab, PreviewService.Action.STATUS);
        controller.access(book, status, null, null, request, response);
        assertNotNull(response.getCookie("preview_guest"));
        assertTrue(response.getCookie("preview_guest").isHttpOnly());
        UUID guest = UUID.fromString(response.getCookie("preview_guest").getValue());
        controller.access(book, read, guest, null, request, response);
        verify(service).access(book, null, guest, tab, PreviewService.Action.READ);
    }
}
