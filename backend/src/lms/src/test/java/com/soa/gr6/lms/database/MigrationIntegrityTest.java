package com.soa.gr6.lms.database;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.util.Set;
import java.util.stream.Collectors;

import jakarta.persistence.Entity;

import org.flywaydb.core.Flyway;
import org.hibernate.SessionFactory;
import org.hibernate.cfg.Configuration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;

/**
 * Bộ migration phải chạy được trên database trống và schema kết quả phải khớp entity,
 * vì production chạy Flyway + {@code ddl-auto=validate}.
 *
 * <p>Test cần một PostgreSQL có quyền CREATEDB truyền qua biến môi trường
 * {@code LMS_TEST_DB_URL} (ví dụ {@code jdbc:postgresql://127.0.0.1:5433/lms_test}),
 * {@code LMS_TEST_DB_USER} (mặc định {@code lms}) và {@code LMS_TEST_DB_PASSWORD}
 * (mặc định {@code lms}). Không có biến này thì test được skip, để CI không cần DB.
 */
class MigrationIntegrityTest {

    private static final String SCRATCH_DB = "lms_flyway_check";
    private static final String TEST_DB_URL = System.getenv("LMS_TEST_DB_URL");

    private static String user() {
        String value = System.getenv("LMS_TEST_DB_USER");
        return value == null || value.isBlank() ? "lms" : value;
    }

    private static String password() {
        String value = System.getenv("LMS_TEST_DB_PASSWORD");
        return value == null || value.isBlank() ? "lms" : value;
    }

    private static String replaceDatabase(String url, String database) {
        return url.substring(0, url.lastIndexOf('/')) + "/" + database;
    }

    /** Toàn bộ entity của app, quét theo annotation để entity mới thêm cũng được validate. */
    private static Set<Class<?>> entityClasses() {
        var scanner = new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(Entity.class));
        return scanner.findCandidateComponents("com.soa.gr6.lms.domain").stream()
                .map(BeanDefinition::getBeanClassName)
                .map(MigrationIntegrityTest::loadClass)
                .collect(Collectors.toSet());
    }

    private static Class<?> loadClass(String name) {
        try {
            return Class.forName(name);
        } catch (ClassNotFoundException e) {
            throw new IllegalStateException("Không nạp được entity " + name, e);
        }
    }

    private static boolean columnExists(Connection connection, String table, String column) throws Exception {
        try (var statement = connection.prepareStatement("""
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = ? AND column_name = ?
                """)) {
            statement.setString(1, table);
            statement.setString(2, column);
            try (ResultSet rows = statement.executeQuery()) {
                return rows.next();
            }
        }
    }

    private interface DatabaseCheck {
        void run(String url) throws Exception;
    }

    /** Dựng database tạm, chạy Flyway thật rồi giao URL cho phần kiểm tra; luôn dọn DB. */
    private void onMigratedScratchDatabase(DatabaseCheck checks) throws Exception {
        assumeTrue(TEST_DB_URL != null && !TEST_DB_URL.isBlank(),
                "Bỏ qua: đặt LMS_TEST_DB_URL để chạy kiểm tra migration trên PostgreSQL thật");

        String url = replaceDatabase(TEST_DB_URL, SCRATCH_DB);
        try (Connection admin = DriverManager.getConnection(
                replaceDatabase(TEST_DB_URL, "postgres"), user(), password());
             var statement = admin.createStatement()) {
            statement.execute("DROP DATABASE IF EXISTS " + SCRATCH_DB);
            statement.execute("CREATE DATABASE " + SCRATCH_DB);
        }
        try {
            var result = Flyway.configure()
                    .dataSource(url, user(), password())
                    .locations("classpath:db/migration")
                    .cleanDisabled(true)
                    .load()
                    .migrate();

            assertThat(result.migrationsExecuted).isGreaterThan(0);
            checks.run(url);
        } finally {
            try (Connection admin = DriverManager.getConnection(
                    replaceDatabase(TEST_DB_URL, "postgres"), user(), password());
                 var statement = admin.createStatement()) {
                statement.execute("DROP DATABASE IF EXISTS " + SCRATCH_DB);
            }
        }
    }

    @Test
    @DisplayName("Flyway migrate database trống: không trùng version và có bảng book_file")
    void flywayMigrationsRunOnEmptyDatabase() throws Exception {
        onMigratedScratchDatabase(url -> {
            try (Connection connection = DriverManager.getConnection(url, user(), password())) {
                try (var statement = connection.createStatement();
                     ResultSet rows = statement.executeQuery("SELECT to_regclass('public.book_file')")) {
                    assertThat(rows.next()).isTrue();
                    assertThat(rows.getString(1)).isEqualTo("book_file");
                }
                assertThat(columnExists(connection, "book_file", "storage_key")).isTrue();
                assertThat(columnExists(connection, "book_file", "sha256")).isTrue();
                assertThat(columnExists(connection, "book", "preview_url")).isFalse();
                assertThat(columnExists(connection, "book", "reader_url")).isFalse();
            }
        });
    }

    @Test
    @DisplayName("Schema Flyway khớp entity: Hibernate validate không báo thiếu bảng/cột (DF-01)")
    void flywaySchemaMatchesJpaEntities() throws Exception {
        onMigratedScratchDatabase(url -> {
            var entities = entityClasses();
            assertThat(entities).isNotEmpty();

            var configuration = new Configuration();
            configuration.setProperty("hibernate.connection.url", url);
            configuration.setProperty("hibernate.connection.username", user());
            configuration.setProperty("hibernate.connection.password", password());
            configuration.setProperty("hibernate.hbm2ddl.auto", "validate");
            configuration.setProperty("hibernate.dialect", "org.hibernate.dialect.PostgreSQLDialect");
            entities.forEach(configuration::addAnnotatedClass);

            // buildSessionFactory() chạy SchemaValidator; thiếu bảng/cột ném
            // SchemaManagementException ("Schema validation: missing ...") ngay tại đây.
            try (SessionFactory sessionFactory = configuration.buildSessionFactory()) {
                assertThat(sessionFactory.isOpen()).isTrue();
            }
        });
    }
}
