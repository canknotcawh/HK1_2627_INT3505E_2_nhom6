package com.soa.gr6.lms.service.support;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.soa.gr6.lms.domain.CanaryAccess;
import com.soa.gr6.lms.domain.enums.CanaryOutcome;
import com.soa.gr6.lms.repository.CanaryAccessRepository;

class CanaryAccessLocationEnricherTest {

    private final CanaryAccessRepository accesses = mock(CanaryAccessRepository.class);
    private final IpGeolocationService geolocation = mock(IpGeolocationService.class);

    private final CanaryAccessLocationEnricher enricher = new CanaryAccessLocationEnricher(accesses, geolocation);

    @Test
    void appliesResolvedLocationToTheStoredAccess() {
        var access = new CanaryAccess(UUID.randomUUID(), Instant.now(), "hash", "ua", CanaryOutcome.OK,
                10L, null, "req", "203.113.1.1");
        assertThat(access.getLocationSource()).isEqualTo(IpLocation.SOURCE_PENDING);
        when(accesses.findById(7L)).thenReturn(Optional.of(access));
        when(geolocation.resolve("203.113.1.1")).thenReturn(new IpLocation("203.113.1.1", "IPv4", "VN",
                "Vietnam", "Hanoi", "Hanoi", 21.03, 105.85, "Asia/Bangkok", "Viettel", IpLocation.SOURCE_GEOIP));

        enricher.enrich(7L, "203.113.1.1");

        assertThat(access.getIpAddress()).isEqualTo("203.113.1.1");
        assertThat(access.getCountryCode()).isEqualTo("VN");
        assertThat(access.getCityName()).isEqualTo("Hanoi");
        assertThat(access.getIsp()).isEqualTo("Viettel");
        assertThat(access.getLocationSource()).isEqualTo(IpLocation.SOURCE_GEOIP);
        verify(accesses).save(access);
    }

    @Test
    void resolveNowPersistsAndReturnsTheLocationForRowsStuckInPending() {
        var access = new CanaryAccess(UUID.randomUUID(), Instant.now(), "hash", "ua", CanaryOutcome.OK,
                10L, null, "req", "203.113.1.1");
        when(accesses.findById(9L)).thenReturn(Optional.of(access));
        when(geolocation.resolve("203.113.1.1")).thenReturn(new IpLocation("203.113.1.1", "IPv4", "VN",
                "Vietnam", "Hanoi", "Hanoi", 21.03, 105.85, "Asia/Bangkok", "Viettel", IpLocation.SOURCE_GEOIP));

        IpLocation location = enricher.resolveNow(9L, "203.113.1.1");

        assertThat(location.city()).isEqualTo("Hanoi");
        assertThat(access.getLocationSource()).isEqualTo(IpLocation.SOURCE_GEOIP);
        verify(accesses).save(access);
    }

    @Test
    void resolveNowReturnsNullWithoutTouchingRowsWhenIpIsMissing() {
        assertThat(enricher.resolveNow(9L, null)).isNull();
        verify(accesses, org.mockito.Mockito.never()).findById(any());
    }

    @Test
    void ignoresMissingAccessOrIp() {
        enricher.enrich(null, "1.2.3.4");
        enricher.enrich(1L, " ");
        verify(accesses, org.mockito.Mockito.never()).save(any());
    }
}
