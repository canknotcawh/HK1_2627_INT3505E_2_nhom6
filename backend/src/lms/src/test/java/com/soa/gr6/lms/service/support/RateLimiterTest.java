package com.soa.gr6.lms.service.support;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;

class RateLimiterTest {

    private static final Instant START = Instant.parse("2026-11-24T00:00:00Z");

    private static final class MutableClock extends Clock {
        private Instant instant;

        private MutableClock(Instant instant) {
            this.instant = instant;
        }

        void advance(Duration duration) {
            instant = instant.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return instant;
        }
    }

    @Test
    void allowsUpToTheLimitThenRejects() {
        RateLimiter limiter = new RateLimiter(new MutableClock(START));

        assertThat(limiter.tryAcquire("k", 2, Duration.ofMinutes(1))).isTrue();
        assertThat(limiter.tryAcquire("k", 2, Duration.ofMinutes(1))).isTrue();
        assertThat(limiter.tryAcquire("k", 2, Duration.ofMinutes(1))).isFalse();
    }

    @Test
    void countsEachKeySeparately() {
        RateLimiter limiter = new RateLimiter(new MutableClock(START));

        assertThat(limiter.tryAcquire("a", 1, Duration.ofMinutes(1))).isTrue();
        assertThat(limiter.tryAcquire("a", 1, Duration.ofMinutes(1))).isFalse();
        assertThat(limiter.tryAcquire("b", 1, Duration.ofMinutes(1))).isTrue();
    }

    @Test
    void resetsWhenTheWindowRollsOver() {
        MutableClock clock = new MutableClock(START);
        RateLimiter limiter = new RateLimiter(clock);

        assertThat(limiter.tryAcquire("k", 1, Duration.ofMinutes(1))).isTrue();
        assertThat(limiter.tryAcquire("k", 1, Duration.ofMinutes(1))).isFalse();

        clock.advance(Duration.ofMinutes(1));

        assertThat(limiter.tryAcquire("k", 1, Duration.ofMinutes(1))).isTrue();
    }

    @Test
    void rejectsEverythingWhenLimitIsNotPositive() {
        RateLimiter limiter = new RateLimiter(new MutableClock(START));

        assertThat(limiter.tryAcquire("k", 0, Duration.ofMinutes(1))).isFalse();
    }
}
