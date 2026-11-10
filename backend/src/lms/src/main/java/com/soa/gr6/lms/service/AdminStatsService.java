package com.soa.gr6.lms.service;

import com.soa.gr6.lms.dto.AdminStatsResponse;
import com.soa.gr6.lms.dto.AdminStatsResponse.DailyLoans;
import com.soa.gr6.lms.dto.AdminStatsResponse.NamedCount;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Read-only aggregates for the admin dashboard, computed in SQL so the browser does not page through every row. */
@Service
public class AdminStatsService {
    private static final int DAYS = 30;
    private static final int TOP = 8;
    private static final List<String> LOAN_STATUSES = List.of("ACTIVE", "PENDING_RETURN", "OVERDUE", "RETURNED", "LOST");

    private final JdbcTemplate jdbc;

    public AdminStatsService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public AdminStatsResponse overview() {
        long totalUsers = count("SELECT COUNT(*) FROM app_user");
        long totalAdmins = count("SELECT COUNT(*) FROM app_user WHERE role = 'ADMIN'");
        long activeBooks = count("SELECT COUNT(*) FROM book WHERE status = 'ACTIVE'");
        Map<String, Object> copies = jdbc.queryForMap(
                "SELECT COALESCE(SUM(total_copies), 0) AS total, COALESCE(SUM(available_copies), 0) AS available "
                        + "FROM book WHERE status = 'ACTIVE'");

        Map<String, Long> byStatus = new LinkedHashMap<>();
        LOAN_STATUSES.forEach(status -> byStatus.put(status, 0L));
        jdbc.query("SELECT status, COUNT(*) AS n FROM loan GROUP BY status",
                rs -> {
                    byStatus.put(rs.getString("status"), rs.getLong("n"));
                });

        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        LocalDate from = today.minusDays(DAYS - 1L);
        Map<LocalDate, long[]> perDay = new LinkedHashMap<>();
        for (int i = 0; i < DAYS; i++) {
            perDay.put(from.plusDays(i), new long[2]);
        }
        jdbc.query("""
                SELECT (borrowed_at AT TIME ZONE 'UTC')::date AS d, COUNT(*) AS n
                FROM loan WHERE borrowed_at >= ?::date GROUP BY d
                """, rs -> {
                    long[] slot = perDay.get(rs.getDate("d").toLocalDate());
                    if (slot != null) {
                        slot[0] = rs.getLong("n");
                    }
                }, from);
        jdbc.query("""
                SELECT (returned_at AT TIME ZONE 'UTC')::date AS d, COUNT(*) AS n
                FROM loan WHERE returned_at IS NOT NULL AND returned_at >= ?::date GROUP BY d
                """, rs -> {
                    long[] slot = perDay.get(rs.getDate("d").toLocalDate());
                    if (slot != null) {
                        slot[1] = rs.getLong("n");
                    }
                }, from);
        List<DailyLoans> daily = perDay.entrySet().stream()
                .map(e -> new DailyLoans(e.getKey(), e.getValue()[0], e.getValue()[1]))
                .toList();

        List<NamedCount> topCategories = jdbc.query("""
                SELECT c.name, COUNT(*) AS n FROM category c
                JOIN book_category bc ON bc.category_id = c.id
                GROUP BY c.name ORDER BY n DESC, c.name LIMIT ?
                """, (rs, i) -> new NamedCount(rs.getString("name"), rs.getLong("n")), TOP);

        List<NamedCount> topBooks = jdbc.query("""
                SELECT b.title, COUNT(l.id) AS n FROM loan l JOIN book b ON b.id = l.book_id
                GROUP BY b.id, b.title ORDER BY n DESC, b.title LIMIT ?
                """, (rs, i) -> new NamedCount(rs.getString("title"), rs.getLong("n")), TOP);

        return new AdminStatsResponse(
                totalUsers, totalAdmins, activeBooks,
                ((Number) copies.get("total")).longValue(),
                ((Number) copies.get("available")).longValue(),
                byStatus, daily, topCategories, topBooks);
    }

    private long count(String sql) {
        Long value = jdbc.queryForObject(sql, Long.class);
        return value == null ? 0 : value;
    }
}
