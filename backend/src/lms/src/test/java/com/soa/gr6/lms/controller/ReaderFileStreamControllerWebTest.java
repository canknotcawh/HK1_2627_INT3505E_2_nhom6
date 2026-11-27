package com.soa.gr6.lms.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.ByteArrayInputStream;
import java.io.InputStream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.soa.gr6.lms.service.CanaryTokenService;
import com.soa.gr6.lms.service.support.ClientIpResolver;

/** Hợp đồng HTTP của luồng tải PDF canary: không cache, không index, hỗ trợ Range. */
class ReaderFileStreamControllerWebTest {

    private static final String TOKEN = "cnr_abcdefghijklmnopqrstuv";
    private static final String FILE_URL = "/api/v1/reader/files/{token}";

    private final CanaryTokenService service = mock(CanaryTokenService.class);

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders
                .standaloneSetup(new ReaderFileController(service, mock(ClientIpResolver.class)))
                .build();
    }

    private static InputStream pdf(int bytes) {
        return new ByteArrayInputStream(new byte[bytes]);
    }

    @Test
    void streamsWholePdfWithNoStoreHeaders() throws Exception {
        when(service.open(eq(TOKEN), any(), any(), any()))
                .thenReturn(new CanaryTokenService.ReaderPayload("reading.pdf", 9, 0, 9, pdf(9)));

        mvc.perform(get(FILE_URL, TOKEN))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "private, no-store, max-age=0"))
                .andExpect(header().string(HttpHeaders.PRAGMA, "no-cache"))
                .andExpect(header().string("X-Robots-Tag", "noindex, nofollow, noarchive"))
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE))
                .andExpect(header().string(HttpHeaders.CONTENT_LENGTH, "9"))
                .andExpect(header().doesNotExist(HttpHeaders.CONTENT_RANGE));
    }

    @Test
    void streamsPartialContentWithContentRange() throws Exception {
        when(service.open(eq(TOKEN), any(), any(), any()))
                .thenReturn(new CanaryTokenService.ReaderPayload("reading.pdf", 4000, 100, 100, pdf(100)));

        mvc.perform(get(FILE_URL, TOKEN).header(HttpHeaders.RANGE, "bytes=100-199"))
                .andExpect(status().isPartialContent())
                .andExpect(header().string(HttpHeaders.CONTENT_RANGE, "bytes 100-199/4000"))
                .andExpect(header().string(HttpHeaders.ACCEPT_RANGES, "bytes"))
                .andExpect(header().string(HttpHeaders.CONTENT_LENGTH, "100"));
    }
}
