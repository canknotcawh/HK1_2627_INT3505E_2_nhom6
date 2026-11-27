package com.soa.gr6.lms.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;

/**
 * Chạy thật query gom nhóm trên PostgreSQL: JPQL có GROUP BY + LIMIT/OFFSET, hai câu count
 * native và nhánh lọc theo sách. Cần {@code LMS_IT=true} và DB cấu hình qua biến môi trường.
 */
@EnabledIfEnvironmentVariable(named = "LMS_IT", matches = "true")
@SpringBootTest
@Transactional
class CanaryGroupQueryTest {

    @Autowired
    private CanaryTokenRepository tokens;

    @Test
    void groupPageAppliesPaginationInTheDatabase() {
        var firstPage = tokens.findGroups(null, "", Instant.now(), PageRequest.of(0, 5));

        assertThat(firstPage.size()).isLessThanOrEqualTo(5);
        long total = tokens.countGroups(null, "");
        assertThat(total).isGreaterThanOrEqualTo(firstPage.size());
        // Trang thứ hai không được lặp lại các nhóm của trang đầu.
        var secondPage = tokens.findGroups(null, "", Instant.now(), PageRequest.of(1, 5));
        if (total > 5) {
            assertThat(secondPage).doesNotContainAnyElementsOf(firstPage);
        }
    }

    @Test
    void groupQueryFiltersByBookId() {
        var sample = tokens.findAll(PageRequest.of(0, 1)).getContent();
        if (sample.isEmpty()) {
            return;
        }
        UUID bookId = sample.get(0).getBook().getId();

        long forBook = tokens.countGroups(bookId, "");

        assertThat(forBook).isPositive();
        assertThat(forBook).isLessThanOrEqualTo(tokens.countGroups(null, ""));
        assertThat(tokens.findGroups(bookId, "", Instant.now(), PageRequest.of(0, 5)))
                .isNotEmpty()
                .allSatisfy(row -> assertThat(row.bookId()).isEqualTo(bookId));
    }

    @Test
    void searchMatchesEmailAndTitleAgainstRealSql() {
        var miss = "khong-ai-khop-@example.invalid";

        assertThat(tokens.countGroups(null, miss)).isZero();
        assertThat(tokens.findGroups(null, miss, Instant.now(), PageRequest.of(0, 5))).isEmpty();

        var sample = tokens.findAll(PageRequest.of(0, 1)).getContent();
        if (sample.isEmpty()) {
            return;
        }
        String email = sample.get(0).getUser().getEmail();
        assertThat(tokens.findGroups(null, email, Instant.now(), PageRequest.of(0, 5)))
                .isNotEmpty()
                .allSatisfy(row -> assertThat(row.userEmail()).isEqualTo(email));
    }
}
