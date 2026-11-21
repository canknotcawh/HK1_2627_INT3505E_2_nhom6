package com.soa.gr6.lms.service;

import java.util.UUID;
import com.soa.gr6.lms.exception.BookNotFoundException;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertEquals;

class PreviewServiceTest {
    @Test
    void missingBookReturnsTheCatalogError() {
        UUID book = UUID.randomUUID();
        JdbcTemplate db = mock(JdbcTemplate.class);
        when(db.queryForObject("select exists(select 1 from book where id=?)", Boolean.class, book)).thenReturn(false);
        PreviewService service = new PreviewService(db);
        var error = assertThrows(BookNotFoundException.class, () ->
                service.access(book, null, UUID.randomUUID(), UUID.randomUUID(), PreviewService.Action.STATUS));
        assertEquals("BOOK_NOT_FOUND", error.getCode());
    }

    @Test
    void countsOnlyCoveredTimeAndStopsAfterAbandonedLease() {
        assertEquals(175000, PreviewService.remaining(180000, 1000, 6000, 100000));
        assertEquals(177000, PreviewService.remaining(180000, 1000, 6000, 4000));
        assertEquals(175000, PreviewService.remaining(175000, 100000, 6000, 101000));
        assertEquals(0, PreviewService.remaining(100, 1000, 6000, 2000));
    }
}
