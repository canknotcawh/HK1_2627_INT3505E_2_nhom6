package com.soa.gr6.lms.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

/**
 * Executor cho việc phân giải vị trí IP sau khi lượt đọc PDF đã commit.
 *
 * <p>Hàng đợi có giới hạn và chính sách bỏ qua khi quá tải: thà mất một dòng vị trí
 * (vẫn còn IP) còn hơn giữ request đọc sách chờ dịch vụ ngoài.</p>
 */
@Configuration
@EnableAsync
public class CanaryAsyncConfig {

    public static final String LOCATION_EXECUTOR = "canaryLocationExecutor";

    @Bean(name = LOCATION_EXECUTOR)
    public Executor canaryLocationExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(1);
        executor.setMaxPoolSize(2);
        executor.setQueueCapacity(500);
        executor.setThreadNamePrefix("canary-location-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.DiscardPolicy());
        executor.setWaitForTasksToCompleteOnShutdown(false);
        executor.initialize();
        return executor;
    }
}
