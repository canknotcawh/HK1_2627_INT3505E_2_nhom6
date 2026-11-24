"""
Unit tests for SQL AST Validator (ai-service).
"""

import pytest
from app.validator import (
    validate_sql,
    SqlInvalid,
    SqlRejected,
    ValidationResult,
)


# 1. SYNTAX ERROR CASES (2 tests -> SqlInvalid)

@pytest.mark.parametrize(
    "sql",
    [
        "SELECT * FORM v_loan_analytics",  # Syntax error: typo FORM instead of FROM
        "SELECT * FROM (SELECT * FROM v_loan_analytics",  # Syntax error: unclosed parenthesis
    ],
    ids=["syntax_typo_form", "syntax_unclosed_parenthesis"],
)
def test_syntax_errors(sql: str):
    """Verifies that malformed SQL syntax raises SqlInvalid."""
    with pytest.raises(SqlInvalid):
        validate_sql(sql)


# 2. SECURITY REJECTION CASES (32 tests -> SqlRejected)

REJECTED_TEST_CASES = [
    # --- Multi-statement (2) ---
    ("SELECT * FROM v_loan_analytics; DROP TABLE app_user;", "multi_statement_drop"),
    ("SELECT * FROM v_loan_analytics; SELECT * FROM v_category_catalog;", "multi_statement_select"),

    # --- DML / DDL / Admin Commands (11) ---
    ("DROP TABLE app_user", "ddl_drop_table"),
    ("DELETE FROM v_loan_analytics", "dml_delete"),
    ("INSERT INTO v_loan_analytics (loan_id) VALUES ('123')", "dml_insert"),
    ("UPDATE v_loan_analytics SET status = 'RETURNED'", "dml_update"),
    ("TRUNCATE TABLE app_user", "ddl_truncate"),
    ("ALTER TABLE app_user ADD COLUMN hacked text", "ddl_alter_table"),
    ("CREATE TABLE hacked (id int)", "ddl_create_table"),
    ("GRANT ALL ON app_user TO PUBLIC", "admin_grant"),
    ("REVOKE ALL ON app_user FROM lms_readonly", "admin_revoke"),
    ("COPY app_user TO '/tmp/data'", "admin_copy"),
    ("SET statement_timeout = 0", "admin_set"),

    # --- SELECT INTO / Lock / Fetch (3) ---
    ("SELECT * INTO hacked FROM v_loan_analytics", "select_into"),
    ("SELECT * FROM v_loan_analytics FOR UPDATE", "row_lock_update"),
    ("SELECT * FROM v_loan_analytics FETCH FIRST 10 ROWS ONLY", "fetch_clause_forbidden"),

    # --- Forbidden Tables, Schema Qualification & Scope Bypass Tricks (12) ---
    ("SELECT * FROM pg_class", "forbidden_pg_class_unaliased"),
    ("SELECT * FROM app_user", "forbidden_app_user_unaliased"),
    ("SELECT * FROM app_user u", "forbidden_app_user_aliased"),
    ("SELECT * FROM pg_catalog.pg_class", "schema_qualified_pg_catalog"),
    ("SELECT * FROM public.v_loan_analytics", "schema_qualified_public"),
    ("WITH cte AS (SELECT * FROM app_user) SELECT * FROM cte", "cte_targeting_forbidden_table"),
    ("WITH v_loan_analytics AS (SELECT * FROM app_user) SELECT * FROM v_loan_analytics", "cte_shadowing_allowed_view"),
    ("SELECT * FROM (SELECT * FROM pg_class) sub", "subquery_targeting_forbidden_table"),
    ("SELECT (SELECT email FROM app_user LIMIT 1) FROM v_loan_analytics", "scalar_subquery_forbidden_table"),
    ("SELECT * FROM generate_series(1, 10)", "generate_series_table"),
    ("SELECT 1", "no_analytical_view_constant"),
    ("SELECT 'hello' AS greeting", "no_analytical_view_literal"),

    # --- Forbidden Functions (sleep, clock, session discovery) (9) ---
    ("SELECT pg_sleep(5) FROM v_loan_analytics", "func_pg_sleep"),
    ("SELECT pg_catalog.pg_sleep(5) FROM v_loan_analytics", "func_pg_catalog_pg_sleep"),
    ("SELECT NOW() FROM v_loan_analytics", "func_clock_now"),
    ("SELECT CURRENT_TIMESTAMP FROM v_loan_analytics", "func_clock_current_timestamp"),
    ("SELECT CURRENT_DATE FROM v_loan_analytics", "func_clock_current_date"),
    ("SELECT generate_series(1, 10) FROM v_loan_analytics", "generate_series_function"),
    ("SELECT current_user FROM v_loan_analytics", "current_user_discovery"),
    ("SELECT session_user FROM v_loan_analytics", "session_user_discovery"),
    ("SELECT version() FROM v_loan_analytics", "version_discovery"),

    # --- Non-native PostgreSQL functions (sqlglot transpile risks) (2) ---
    ("SELECT DATEDIFF(day, borrowed_at, due_at) FROM v_loan_analytics", "unsupported_datediff_function"),
    ("SELECT TRY_CAST(borrowed_at AS date) FROM v_loan_analytics", "unsupported_try_cast_function"),

    # --- Relative Date/Time String Literals with whitespace and case variants (7) ---
    ("SELECT * FROM v_loan_analytics WHERE borrowed_at >= 'now'", "literal_now_bare"),
    ("SELECT * FROM v_loan_analytics WHERE borrowed_at >= 'today'", "literal_today"),
    ("SELECT * FROM v_loan_analytics WHERE borrowed_at >= 'yesterday'", "literal_yesterday"),
    ("SELECT * FROM v_loan_analytics WHERE borrowed_at >= '  nOw  '", "literal_now_whitespace_mixedcase"),
    ("SELECT * FROM v_loan_analytics WHERE borrowed_at >= 'now - 1 day'", "literal_now_minus_interval"),
    ("SELECT * FROM v_loan_analytics WHERE borrowed_at >= ' NOW - 7 days '", "literal_now_minus_interval_whitespace"),
    ("SELECT * FROM v_loan_analytics WHERE borrowed_at >= 'TODAY + 1 day'", "literal_today_plus_interval"),
]

assert len(REJECTED_TEST_CASES) == 46, f"Expected 46 rejected test cases, got {len(REJECTED_TEST_CASES)}"


@pytest.mark.parametrize("sql,case_id", REJECTED_TEST_CASES, ids=[c[1] for c in REJECTED_TEST_CASES])
def test_rejected_queries(sql: str, case_id: str):
    """Verifies that all 32 attack, DDL/DML, bypass, and non-deterministic queries raise SqlRejected."""
    with pytest.raises(SqlRejected):
        validate_sql(sql)


# 3. ACCEPTED QUERIES (13 tests -> ValidationResult)

ACCEPTED_TEST_CASES = [
    (
        "SELECT loan_id, user_full_name, book_title FROM v_loan_analytics LIMIT 5",
        "basic_projection_with_limit",
    ),
    (
        "SELECT user_full_name, COUNT(*) AS total_borrows FROM v_loan_analytics GROUP BY user_id, user_full_name ORDER BY total_borrows DESC, user_id ASC LIMIT 5",
        "top5_borrowers_aggregation",
    ),
    (
        "SELECT category_name, COUNT(loan_id) AS borrow_count FROM v_loan_category_analytics GROUP BY category_id, category_name ORDER BY borrow_count DESC LIMIT 10",
        "category_borrow_count_ranking",
    ),
    (
        "SELECT category_name FROM v_category_catalog ORDER BY category_name ASC",
        "category_catalog_listing",
    ),
    (
        "SELECT DATE_TRUNC('month', borrowed_at) AS month_grain, COUNT(*) AS total FROM v_loan_analytics GROUP BY 1 ORDER BY 1",
        "monthly_trend_date_trunc",
    ),
    (
        "SELECT * FROM v_loan_analytics WHERE borrowed_at >= '2026-10-01 00:00:00+07'::timestamptz AND borrowed_at < '2026-11-01 00:00:00+07'::timestamptz",
        "fixed_iso_timestamp_filtering",
    ),
    (
        "SELECT status, COUNT(*) AS count, ROUND(AVG(EXTRACT(epoch FROM (COALESCE(returned_at, due_at) - borrowed_at))/86400)::numeric, 2) FROM v_loan_analytics GROUP BY status",
        "complex_math_coalesce_round_extract",
    ),
    (
        "SELECT user_full_name, book_title, borrowed_at, due_at FROM v_loan_analytics WHERE status = 'OVERDUE' OR (status IN ('ACTIVE', 'PENDING_RETURN') AND due_at < '2026-11-21 12:00:00+07'::timestamptz)",
        "dynamic_overdue_business_rule",
    ),
    (
        "WITH monthly_loans AS (SELECT DATE_TRUNC('month', borrowed_at) AS m, COUNT(*) AS c FROM v_loan_analytics GROUP BY 1) SELECT m, c FROM monthly_loans WHERE c > 0",
        "valid_cte_on_analytical_view",
    ),
    (
        "SELECT v.loan_id, c.category_name FROM v_loan_analytics v JOIN v_loan_category_analytics c ON v.loan_id = c.loan_id LIMIT 20",
        "join_between_allowed_views",
    ),
    (
        "SELECT book_title, STRING_AGG(category_name, ', ') AS cats FROM v_loan_category_analytics GROUP BY book_id, book_title LIMIT 10",
        "string_agg_group_concat",
    ),
    (
        "SELECT user_full_name, RANK() OVER (ORDER BY COUNT(*) DESC) AS rnk FROM v_loan_analytics GROUP BY user_id, user_full_name",
        "window_function_rank",
    ),
    (
        "SELECT loan_id, 'ACTIVE' AS type FROM v_loan_analytics UNION ALL SELECT loan_id, 'LOST' AS type FROM v_loan_analytics WHERE status = 'LOST'",
        "union_all_valid_views",
    ),
    # Substring search on book title / user name containing 'now', 'know', 'snow' without being blocked
    (
        "SELECT * FROM v_loan_analytics WHERE book_title ILIKE '%Snow%'",
        "search_book_title_with_snow",
    ),
    (
        "SELECT * FROM v_loan_analytics WHERE book_title ILIKE '%know%'",
        "search_book_title_with_know",
    ),
    (
        "SELECT * FROM v_loan_analytics WHERE user_full_name ILIKE '%Nowhere%'",
        "search_user_name_with_nowhere",
    ),
]

assert len(ACCEPTED_TEST_CASES) == 16, f"Expected 16 accepted test cases, got {len(ACCEPTED_TEST_CASES)}"


@pytest.mark.parametrize("sql,case_id", ACCEPTED_TEST_CASES, ids=[c[1] for c in ACCEPTED_TEST_CASES])
def test_accepted_queries(sql: str, case_id: str):
    """Verifies that all 16 valid business reporting queries pass validation."""
    result = validate_sql(sql)
    assert isinstance(result, ValidationResult)
    assert result.sql is not None and len(result.sql) > 0


@pytest.mark.parametrize("sql,case_id", ACCEPTED_TEST_CASES, ids=[c[1] for c in ACCEPTED_TEST_CASES])
def test_accepted_queries_regenerated_sql_valid_postgres(sql: str, case_id: str):
    """Verifies that regenerated SQL from all accepted queries parses cleanly as Postgres dialect."""
    import sqlglot
    result = validate_sql(sql)
    parsed = sqlglot.parse_one(result.sql, read="postgres")
    assert parsed is not None
    sql_upper = result.sql.upper()
    assert "DATEDIFF" not in sql_upper
    assert "TRY_CAST" not in sql_upper


# 4. LIMIT AND TIME GRAIN CASES (5 tests)

def test_limit_injected_when_missing():
    """1. Enforces LIMIT 101 when query has no LIMIT clause."""
    sql = "SELECT * FROM v_loan_analytics"
    res = validate_sql(sql)
    assert "LIMIT 101" in res.sql.upper()


def test_limit_preserved_when_under_max():
    """2. Preserves existing LIMIT when <= 101."""
    sql = "SELECT * FROM v_loan_analytics LIMIT 5"
    res = validate_sql(sql)
    assert "LIMIT 5" in res.sql.upper()


def test_limit_clamped_when_exceeding_max():
    """3. Clamps LIMIT to 101 when query requests more (e.g. LIMIT 500)."""
    sql = "SELECT * FROM v_loan_analytics LIMIT 500"
    res = validate_sql(sql)
    assert "LIMIT 101" in res.sql.upper()
    assert "500" not in res.sql


def test_time_grain_extracted_for_single_date_trunc():
    """4. Correctly extracts time_grain when exactly one DATE_TRUNC unit is present."""
    sql = "SELECT DATE_TRUNC('month', borrowed_at) AS month_start, COUNT(*) FROM v_loan_analytics GROUP BY 1"
    res = validate_sql(sql)
    assert res.time_grain == "month"


def test_time_grain_none_when_multiple_or_absent():
    """5. Returns time_grain=None when DATE_TRUNC is absent or multiple units exist."""
    # Absent
    res1 = validate_sql("SELECT COUNT(*) FROM v_loan_analytics")
    assert res1.time_grain is None

    # Multiple distinct units
    sql_multi = "SELECT DATE_TRUNC('month', borrowed_at), DATE_TRUNC('day', due_at) FROM v_loan_analytics"
    res2 = validate_sql(sql_multi)
    assert res2.time_grain is None
