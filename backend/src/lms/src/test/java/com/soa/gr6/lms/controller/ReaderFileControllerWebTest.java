package com.soa.gr6.lms.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.soa.gr6.lms.domain.CanaryReadingEvent;
import com.soa.gr6.lms.domain.CanaryToken;
import com.soa.gr6.lms.domain.enums.CanaryReadingEventType;
import com.soa.gr6.lms.exception.GlobalExceptionHandler;
import com.soa.gr6.lms.repository.BookFileRepository;
import com.soa.gr6.lms.repository.BookRepository;
import com.soa.gr6.lms.repository.CanaryAccessRepository;
import com.soa.gr6.lms.repository.CanaryReadingEventRepository;
import com.soa.gr6.lms.repository.CanaryTokenRepository;
import com.soa.gr6.lms.repository.LoanRepository;
import com.soa.gr6.lms.repository.UserRepository;
import com.soa.gr6.lms.service.imple.CanaryTokenServiceImpl;
import com.soa.gr6.lms.service.support.CanaryAccessLocationEnricher;
import com.soa.gr6.lms.service.support.ClientIpResolver;
import com.soa.gr6.lms.service.support.IpGeolocationService;
import com.soa.gr6.lms.service.support.RateLimiter;
import com.soa.gr6.lms.storage.StorageService;

/**
 * Endpoint ghi hành vi đọc đang nhận tham số form (không phải JSON) để beacon lúc đóng tab
 * không vướng preflight. Test đi qua cả controller lẫn service thật nên phần cắt detail
 * cũng được phủ.
 */
class ReaderFileControllerWebTest {

    private static final String TOKEN = "cnr_abcdefghijklmnopqrstuv";
    private static final String EVENT_URL = "/api/v1/reader/files/{token}/events";

    private final CanaryTokenRepository tokens = mock(CanaryTokenRepository.class);
    private final CanaryReadingEventRepository readingEvents = mock(CanaryReadingEventRepository.class);

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        CanaryToken token = mock(CanaryToken.class);
        when(token.getId()).thenReturn(UUID.randomUUID());
        when(tokens.findByTokenHash(any())).thenReturn(Optional.of(token));

        CanaryTokenServiceImpl service = new CanaryTokenServiceImpl(
                tokens,
                mock(CanaryAccessRepository.class),
                readingEvents,
                mock(BookRepository.class),
                mock(BookFileRepository.class),
                mock(LoanRepository.class),
                mock(UserRepository.class),
                mock(StorageService.class),
                new RateLimiter(),
                mock(IpGeolocationService.class),
                mock(CanaryAccessLocationEnricher.class),
                new MockEnvironment(),
                Duration.ofMinutes(30), Duration.ofMinutes(15), Duration.ofHours(12), "", 10, 120);

        mvc = MockMvcBuilders
                .standaloneSetup(new ReaderFileController(service, mock(ClientIpResolver.class)))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    private CanaryReadingEvent recordedEvent() {
        ArgumentCaptor<CanaryReadingEvent> saved = ArgumentCaptor.forClass(CanaryReadingEvent.class);
        verify(readingEvents).save(saved.capture());
        return saved.getValue();
    }

    @Test
    void recordsValidFormEvent() throws Exception {
        mvc.perform(post(EVENT_URL, TOKEN)
                        .param("event", "open")
                        .param("detail", "reader-ready"))
                .andExpect(status().isNoContent());

        CanaryReadingEvent event = recordedEvent();
        assertThat(event.getEvent()).isEqualTo(CanaryReadingEventType.OPEN);
        assertThat(event.getDetail()).isEqualTo("reader-ready");
    }

    @Test
    void rejectsUnknownEventName() throws Exception {
        mvc.perform(post(EVENT_URL, TOKEN)
                        .param("event", "NOPE"))
                .andExpect(status().isBadRequest());

        verify(readingEvents, never()).save(any());
    }

    @Test
    void rejectsMissingEventParam() throws Exception {
        mvc.perform(post(EVENT_URL, TOKEN)
                        .param("detail", "no-event"))
                .andExpect(status().isBadRequest());

        verify(readingEvents, never()).save(any());
    }

    @Test
    void truncatesLongDetailToColumnLimit() throws Exception {
        String longDetail = "x".repeat(400);

        mvc.perform(post(EVENT_URL, TOKEN)
                        .param("event", "SUSPICIOUS")
                        .param("detail", longDetail))
                .andExpect(status().isNoContent());

        CanaryReadingEvent event = recordedEvent();
        assertThat(event.getEvent()).isEqualTo(CanaryReadingEventType.SUSPICIOUS);
        assertThat(event.getDetail()).isEqualTo(longDetail.substring(0, 160));
    }

    @Test
    void ignoresUnknownTokenWithoutRecording() throws Exception {
        when(tokens.findByTokenHash(any())).thenReturn(Optional.empty());

        mvc.perform(post(EVENT_URL, TOKEN).param("event", "OPEN"))
                .andExpect(status().isNoContent());

        verify(readingEvents, never()).save(any());
    }

    @Test
    void storesNullWhenDetailIsEmpty() throws Exception {
        mvc.perform(post(EVENT_URL, TOKEN)
                        .param("event", "CLOSE")
                        .param("detail", ""))
                .andExpect(status().isNoContent());

        assertThat(recordedEvent().getDetail()).isNull();
    }
}
