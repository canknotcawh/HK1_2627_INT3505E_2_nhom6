package com.soa.gr6.lms.service;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

class PreviewServiceTest {
    @Test
    void countsOnlyCoveredTimeAndStopsAfterAbandonedLease() {
        assertEquals(175000, PreviewService.remaining(180000, 1000, 6000, 100000));
        assertEquals(177000, PreviewService.remaining(180000, 1000, 6000, 4000));
        assertEquals(175000, PreviewService.remaining(175000, 100000, 6000, 101000));
        assertEquals(0, PreviewService.remaining(100, 1000, 6000, 2000));
    }
}
