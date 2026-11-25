package com.soa.gr6.lms.dto;

import com.soa.gr6.lms.domain.CanaryReadingEvent;

import java.time.Instant;

public record CanaryReadingEventResponse(
        Long id,
        Instant occurredAt,
        String event,
        String detail,
        String ipAddress) {

    public static CanaryReadingEventResponse from(CanaryReadingEvent event) {
        return new CanaryReadingEventResponse(
                event.getId(),
                event.getOccurredAt(),
                event.getEvent().name(),
                event.getDetail(),
                event.getIpAddress());
    }
}
