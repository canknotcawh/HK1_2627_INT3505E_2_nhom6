package com.soa.gr6.lms.service.support;

import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Giới hạn tần suất trong bộ nhớ theo cửa sổ cố định (fixed window). Đủ cho một
 * instance backend; nếu chạy nhiều instance thì cần thay bằng store chia sẻ.
 */
@Component
public class RateLimiter {

    private static final int CLEANUP_THRESHOLD = 10_000;

    private final Clock clock;
    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    public RateLimiter() {
        this(Clock.systemUTC());
    }

    RateLimiter(Clock clock) {
        this.clock = clock;
    }

    /** Ghi nhận một lượt và cho biết lượt đó có nằm trong hạn mức hay không. */
    public boolean tryAcquire(String key, int limit, Duration window) {
        if (limit <= 0) {
            return false;
        }
        long seconds = Math.max(1, window.toSeconds());
        long index = clock.instant().getEpochSecond() / seconds;

        Window updated = windows.compute(key,
                (ignored, current) -> current == null || current.index() != index
                        ? new Window(index, 1)
                        : new Window(index, current.count() + 1));

        if (windows.size() > CLEANUP_THRESHOLD) {
            evictStale(index);
        }
        return updated.count() <= limit;
    }

    private void evictStale(long currentIndex) {
        windows.entrySet().removeIf(entry -> entry.getValue().index() < currentIndex);
    }

    private record Window(long index, int count) {
    }

    /** Cho test hoặc job dọn dẹp biết thời điểm hiện tại theo cùng đồng hồ. */
    Instant now() {
        return clock.instant();
    }
}
