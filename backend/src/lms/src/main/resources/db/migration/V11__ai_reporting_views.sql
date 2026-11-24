-- Migration V11: Analytics views and lms_readonly role for AI Text-to-SQL reporting

-- 1. Create or update lms_readonly role with password from Flyway placeholder
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'lms_readonly') THEN
        CREATE ROLE lms_readonly WITH LOGIN PASSWORD '${readonly_password}';
    ELSE
        ALTER ROLE lms_readonly WITH PASSWORD '${readonly_password}';
    END IF;
END
$$;

-- 2. Configure session security & performance limits on lms_readonly
ALTER ROLE lms_readonly SET default_transaction_read_only = on;
ALTER ROLE lms_readonly SET statement_timeout = '2000'; -- 2s execution timeout
ALTER ROLE lms_readonly SET idle_in_transaction_session_timeout = '5000'; -- 5s idle timeout
ALTER ROLE lms_readonly SET timezone = 'Asia/Ho_Chi_Minh'; -- Enforce local timezone for DATE_TRUNC
ALTER ROLE lms_readonly CONNECTION LIMIT 5;

-- 3. Analytics Views

-- View 1: v_loan_analytics
-- Grain: 1 row / loan. Categories are aggregated with string_agg to prevent row duplication on COUNT(*).
CREATE OR REPLACE VIEW v_loan_analytics AS
SELECT
    l.id AS loan_id,
    l.borrowed_at,
    l.due_at,
    l.returned_at,
    l.status,
    l.renewed_count,
    u.id AS user_id,
    u.full_name AS user_full_name,
    u.email AS user_email, -- Chu y: Day la thong tin PII co y dinh de thu thu lien he xac minh khi can doi soat muon tra
    b.id AS book_id,
    b.title AS book_title,
    b.published_year AS published_year,
    COALESCE(string_agg(c.name, ', ' ORDER BY c.name), '') AS categories
FROM loan l
JOIN app_user u ON l.user_id = u.id
JOIN book b ON l.book_id = b.id
LEFT JOIN book_category bc ON bc.book_id = b.id
LEFT JOIN category c ON bc.category_id = c.id
GROUP BY
    l.id,
    l.borrowed_at,
    l.due_at,
    l.returned_at,
    l.status,
    l.renewed_count,
    u.id,
    u.full_name,
    u.email,
    b.id,
    b.title,
    b.published_year;

-- View 2: v_loan_category_analytics
-- Grain: 1 row / (loan, category). Preserves category granularity and loan timestamp for category analytics.
CREATE OR REPLACE VIEW v_loan_category_analytics AS
SELECT
    l.id AS loan_id,
    l.borrowed_at,
    l.due_at,
    l.returned_at,
    l.status,
    c.id AS category_id,
    c.name AS category_name,
    b.id AS book_id,
    b.title AS book_title,
    u.id AS user_id,
    u.full_name AS user_full_name
FROM loan l
JOIN book b ON l.book_id = b.id
JOIN app_user u ON l.user_id = u.id
JOIN book_category bc ON bc.book_id = b.id
JOIN category c ON bc.category_id = c.id;

-- View 3: v_category_catalog
-- Grain: 1 row / category. Used for dynamic category catalog injection into the system prompt.
-- Dong bo dinh danh category_id, category_name voi v_loan_category_analytics.
CREATE OR REPLACE VIEW v_category_catalog AS
SELECT
    id AS category_id,
    name AS category_name
FROM category;

-- 4. Permissions for lms_readonly
GRANT USAGE ON SCHEMA public TO lms_readonly;

-- Revoke all permissions on existing public tables, sequences, and routines
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM lms_readonly;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM lms_readonly;
REVOKE CREATE ON SCHEMA public FROM lms_readonly;

-- LUU Y KY THUAT VE ROUTINES VA SYSTEM CATALOGS:
-- 1) PostgreSQL mac dinh cap quyen EXECUTE tren public routines cho pseudo-role PUBLIC.
--    Lenh REVOKE ALL ON ALL ROUTINES ... FROM lms_readonly KHONG thu hoi duoc quyen mac dinh do cua PUBLIC.
-- 2) PostgreSQL cho phep moi authenticated role doc he thong catalog (pg_class, pg_proc, information_schema).
-- Chinh vi vay, viec chan goi ham khong cho phep va chan doc catalog he thong HOAN TOAN DUOC DAM BAO boi
-- Layer 4 (AST Validator Allowlist) cua ai-service chu khong the dua vao quyen database don thuan.
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM lms_readonly;

-- Explicitly allow SELECT ONLY on the 3 reporting views
GRANT SELECT ON v_loan_analytics TO lms_readonly;
GRANT SELECT ON v_loan_category_analytics TO lms_readonly;
GRANT SELECT ON v_category_catalog TO lms_readonly;
