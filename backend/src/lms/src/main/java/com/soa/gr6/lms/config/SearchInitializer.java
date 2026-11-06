package com.soa.gr6.lms.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;

@Component
@RequiredArgsConstructor
@Slf4j
public class SearchInitializer {

    private final JdbcTemplate jdbcTemplate;

    @EventListener(ApplicationReadyEvent.class)
    public void initSearchExtensionsAndIndexes() {
        log.info("Running search initialization script after Hibernate schema generation...");
        try {
            ClassPathResource resource = new ClassPathResource("data/init_search.sql");
            try (InputStream is = resource.getInputStream()) {
                String sql = new String(is.readAllBytes(), StandardCharsets.UTF_8);
                jdbcTemplate.execute(sql);
                log.info("Search extensions, functions, and GIN indexes initialized successfully.");
            }
        } catch (Exception e) {
            log.error("Failed to initialize search schema: {}", e.getMessage(), e);
        }
    }
}
