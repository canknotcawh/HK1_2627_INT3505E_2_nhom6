package com.soa.gr6.lms.service.identity;

import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class LoginAttemptService {

    private static final String KEY_PREFIX = "auth:login_fail:";
    private String key(String email) {
        return KEY_PREFIX + email;
    }

    private final StringRedisTemplate redis;
    private final int maxAttempts;
    private final Duration lockDuration;

    public LoginAttemptService( StringRedisTemplate redis, 
                                @Value("${app.login.max-attempts}") int maxAttempts, 
                                @Value("${app.login.lock-minutes}") Duration lockDuration) {
        this.redis = redis;
        this.maxAttempts = maxAttempts;
        this.lockDuration = Duration.ofMinutes(lockDuration.toMinutes());
    }

    public boolean isLocked(String email) {
        String value = redis.opsForValue().get(key(email));
        return value != null && Integer.parseInt(value) >= maxAttempts;
    }

    public void recordFailure(String email) {
        String key = key(email);
        Long count = redis.opsForValue().increment(key);
        if (count != null && count == 1) {
            redis.expire(key, lockDuration);
        }
    }

    public void reset(String email) {
        redis.delete(key(email));
    }
}
