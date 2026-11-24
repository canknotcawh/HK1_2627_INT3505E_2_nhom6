"""Comprehensive service test suite for Milestone 3 (ai-service).

Tests:
1. Configuration & fail-fast checks.
2. Internal JWT authentication & authorization (all error branches).
3. Dynamic time boundary computation in Asia/Ho_Chi_Minh.
4. Database type mapping & value serialization.
5. End-to-end FastAPI endpoint behavior with mocked Gemini & DB.
"""

from datetime import datetime
from decimal import Decimal
import time
from unittest.mock import AsyncMock, patch
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo

import jwt
import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.db import (
    ColumnInfo,
    DbSyntaxError,
    DbTimeoutError,
    QueryExecutionResult,
    get_column_type,
    serialize_value,
)
from app.gemini_client import LlmAnswer
from app.main import app
from app.prompt import calculate_time_boundaries

VN_TZ = ZoneInfo("Asia/Ho_Chi_Minh")
TEST_SECRET = "test_internal_jwt_secret_key_at_least_32_bytes_long!"

client = TestClient(app)

# 1. CONFIGURATION TESTS

def test_settings_secret_length_validation():
    """Fail-fast: Rejects secrets shorter than 32 bytes."""
    with pytest.raises(ValueError, match="at least 32 bytes"):
        Settings(INTERNAL_JWT_SECRET="short_secret")


def test_settings_valid_secret():
    """Accepts valid secrets of 32+ bytes."""
    s = Settings(INTERNAL_JWT_SECRET="valid_secret_with_32_bytes_or_more_characters!")
    assert len(s.internal_jwt_secret.encode()) >= 32


# 2. INTERNAL JWT AUTHENTICATION & AUTHORIZATION TESTS

def create_test_jwt(
    secret: str = TEST_SECRET,
    iss: str = "lms-gateway",
    aud: str = "lms-ai",
    scope: str = "lms-ai-internal",
    role: str = "ROLE_ADMIN",
    ttl_seconds: int = 60,
) -> str:
    """Helper to generate internal JWTs with configurable claims."""
    now = int(time.time())
    payload = {
        "iss": iss,
        "aud": aud,
        "sub": "admin-test-uuid",
        "scope": scope,
        "role": role,
        "jti": str(uuid4()),
        "iat": now,
        "exp": now + ttl_seconds,
    }
    return jwt.encode(payload, secret, algorithm="HS256")


@pytest.fixture
def override_jwt_secret():
    """Overrides settings.internal_jwt_secret for tests."""
    with patch("app.auth.settings.internal_jwt_secret", TEST_SECRET):
        yield


def test_auth_missing_header(override_jwt_secret):
    """Missing Authorization header returns 401 UNAUTHORIZED."""
    resp = client.post("/internal/v1/analytics", json={
        "prompt": "Top 5 bạn đọc",
        "reference_time": "2026-11-21T12:00:00+07:00",
    })
    assert resp.status_code == 401
    assert resp.json()["detail"]["code"] == "UNAUTHORIZED"


def test_auth_expired_token(override_jwt_secret):
    """Expired token returns 401 TOKEN_EXPIRED."""
    token = create_test_jwt(ttl_seconds=-10)
    resp = client.post(
        "/internal/v1/analytics",
        headers={"Authorization": f"Bearer {token}"},
        json={"prompt": "Top 5 bạn đọc", "reference_time": "2026-11-21T12:00:00+07:00"},
    )
    assert resp.status_code == 401
    assert resp.json()["detail"]["code"] == "TOKEN_EXPIRED"


def test_auth_wrong_secret(override_jwt_secret):
    """Token signed with wrong secret returns 401 INVALID_TOKEN."""
    token = create_test_jwt(secret="wrong_secret_key_also_needs_to_be_32_bytes_long!")
    resp = client.post(
        "/internal/v1/analytics",
        headers={"Authorization": f"Bearer {token}"},
        json={"prompt": "Top 5 bạn đọc", "reference_time": "2026-11-21T12:00:00+07:00"},
    )
    assert resp.status_code == 401
    assert resp.json()["detail"]["code"] == "INVALID_TOKEN"


def test_auth_wrong_issuer(override_jwt_secret):
    """Token with invalid issuer returns 401 INVALID_TOKEN."""
    token = create_test_jwt(iss="unknown-gateway")
    resp = client.post(
        "/internal/v1/analytics",
        headers={"Authorization": f"Bearer {token}"},
        json={"prompt": "Top 5 bạn đọc", "reference_time": "2026-11-21T12:00:00+07:00"},
    )
    assert resp.status_code == 401
    assert resp.json()["detail"]["code"] == "INVALID_TOKEN"


def test_auth_wrong_scope(override_jwt_secret):
    """Token with invalid scope returns 401 INVALID_SCOPE."""
    token = create_test_jwt(scope="public-access")
    resp = client.post(
        "/internal/v1/analytics",
        headers={"Authorization": f"Bearer {token}"},
        json={"prompt": "Top 5 bạn đọc", "reference_time": "2026-11-21T12:00:00+07:00"},
    )
    assert resp.status_code == 401
    assert resp.json()["detail"]["code"] == "INVALID_SCOPE"


def test_auth_non_admin_role_forbidden(override_jwt_secret):
    """Non-admin user role returns 403 FORBIDDEN."""
    token = create_test_jwt(role="ROLE_USER")
    resp = client.post(
        "/internal/v1/analytics",
        headers={"Authorization": f"Bearer {token}"},
        json={"prompt": "Top 5 bạn đọc", "reference_time": "2026-11-21T12:00:00+07:00"},
    )
    assert resp.status_code == 403
    assert resp.json()["detail"]["code"] == "FORBIDDEN"


# 3. TIME BOUNDARY CALCULATION TESTS

def test_time_boundary_calculations_fixed_reference():
    """Verifies that all 10 pre-calculated time boundaries match exact expected dates."""
    # Reference: 2026-11-21 12:00:00+07 (Saturday)
    ref = "2026-11-21T12:00:00+07:00"
    bounds = calculate_time_boundaries(ref)

    assert bounds["reference_time"] == "'2026-11-21 12:00:00+07'::timestamptz"
    assert bounds["today_start"] == "'2026-11-21 00:00:00+07'::timestamptz"
    assert bounds["week_start"] == "'2026-11-16 00:00:00+07'::timestamptz"  # Monday
    assert bounds["month_start"] == "'2026-11-01 00:00:00+07'::timestamptz"
    assert bounds["quarter_start"] == "'2026-10-01 00:00:00+07'::timestamptz"  # Q4 starts Oct 1
    assert bounds["year_start"] == "'2026-01-01 00:00:00+07'::timestamptz"
    assert bounds["last_7_days_start"] == "'2026-11-14 12:00:00+07'::timestamptz"
    assert bounds["last_30_days_start"] == "'2026-10-22 12:00:00+07'::timestamptz"
    assert bounds["prev_month_start"] == "'2026-10-01 00:00:00+07'::timestamptz"
    assert bounds["prev_quarter_start"] == "'2026-07-01 00:00:00+07'::timestamptz"  # Q3 starts Jul 1


# 4. DATABASE TYPE MAPPING & SERIALIZATION TESTS

def test_oid_type_mapping():
    """Verifies mapping of PostgreSQL OIDs to contract type strings."""
    assert get_column_type(20) == "number"      # bigint
    assert get_column_type(23) == "number"      # int4
    assert get_column_type(1700) == "number"    # numeric
    assert get_column_type(1082) == "datetime"  # date
    assert get_column_type(1184) == "datetime"  # timestamptz
    assert get_column_type(25) == "text"        # text
    assert get_column_type(1043) == "text"      # varchar
    assert get_column_type(2950) == "uuid"      # uuid
    assert get_column_type(16) == "boolean"     # bool
    assert get_column_type(999999) == "other"   # unknown oid


def test_value_serialization():
    """Verifies JSON serialization of database Python types."""
    # Decimals
    assert serialize_value(Decimal("42")) == 42
    assert isinstance(serialize_value(Decimal("42")), int)
    assert serialize_value(Decimal("42.5")) == 42.5
    assert isinstance(serialize_value(Decimal("42.5")), float)

    # UUID
    u = uuid4()
    assert serialize_value(u) == str(u)

    # Datetime
    dt = datetime(2026, 11, 21, 12, 0, 0, tzinfo=VN_TZ)
    assert serialize_value(dt) == dt.isoformat()

    # None and primitives
    assert serialize_value(None) is None
    assert serialize_value("hello") == "hello"

    # Lists
    assert serialize_value([Decimal("1"), Decimal("2.5")]) == [1, 2.5]


# 5. FASTAPI ENDPOINT INTEGRATION TESTS

def test_health_check():
    """Health check endpoint returns status UP."""
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "UP"


def test_bad_prompt_length(override_jwt_secret):
    """Empty prompt or prompt > 1000 characters returns 422 BAD_PROMPT."""
    token = create_test_jwt()
    # Empty
    resp1 = client.post(
        "/internal/v1/analytics",
        headers={"Authorization": f"Bearer {token}"},
        json={"prompt": "   ", "reference_time": "2026-11-21T12:00:00+07:00"},
    )
    assert resp1.status_code == 422
    assert resp1.json()["detail"]["code"] == "BAD_PROMPT"

    # > 1000 chars
    resp2 = client.post(
        "/internal/v1/analytics",
        headers={"Authorization": f"Bearer {token}"},
        json={"prompt": "a" * 1001, "reference_time": "2026-11-21T12:00:00+07:00"},
    )
    assert resp2.status_code == 422
    assert resp2.json()["detail"]["code"] == "BAD_PROMPT"


def test_endpoint_out_of_scope(override_jwt_secret):
    """When Gemini identifies question as OUT_OF_SCOPE, returns 200 with OUT_OF_SCOPE status."""
    token = create_test_jwt()
    mock_llm = AsyncMock(return_value=LlmAnswer(
        status="OUT_OF_SCOPE",
        sql=None,
        message="Thời tiết nằm ngoài phạm vi phân tích thư viện.",
    ))

    with patch("app.main.ask_gemini", mock_llm):
        resp = client.post(
            "/internal/v1/analytics",
            headers={"Authorization": f"Bearer {token}"},
            json={"prompt": "Thời tiết hôm nay?", "reference_time": "2026-11-21T12:00:00+07:00"},
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "OUT_OF_SCOPE"
    assert data["sql"] is None
    assert data["columns"] == []
    assert data["rows"] == []
    assert "Thời tiết" in data["message"]


def test_endpoint_sql_rejected_returns_400(override_jwt_secret):
    """When LLM generates attack SQL, AST validator rejects with 400 REJECTED without retry."""
    token = create_test_jwt()
    mock_llm = AsyncMock(return_value=LlmAnswer(
        status="OK",
        sql="DROP TABLE app_user",
    ))

    with patch("app.main.ask_gemini", mock_llm):
        resp = client.post(
            "/internal/v1/analytics",
            headers={"Authorization": f"Bearer {token}"},
            json={"prompt": "Xóa bảng app_user", "reference_time": "2026-11-21T12:00:00+07:00"},
        )

    assert resp.status_code == 400
    data = resp.json()["detail"]
    assert data["code"] == "REJECTED"
    assert data["sql"] == "DROP TABLE app_user"
    assert len(data["message"]) > 0


def test_endpoint_success_flow(override_jwt_secret):
    """Full successful query flow: LLM generates valid SQL -> AST validates -> DB executes -> returns 200."""
    token = create_test_jwt()
    valid_sql = "SELECT user_full_name, COUNT(*) AS total_borrows FROM v_loan_analytics GROUP BY user_id, user_full_name ORDER BY total_borrows DESC, user_id ASC LIMIT 5"
    mock_llm = AsyncMock(return_value=LlmAnswer(status="OK", sql=valid_sql))

    mock_db_res = QueryExecutionResult(
        columns=[
            ColumnInfo(name="user_full_name", type="text"),
            ColumnInfo(name="total_borrows", type="number"),
        ],
        rows=[
            ["Nguyễn Văn An", 7],
            ["Trần Thị Bích", 6],
            ["Lê Văn Cường", 5],
            ["Phạm Minh Đức", 3],
            ["Hoàng Hương Giang", 2],
        ],
        truncated=False,
    )
    mock_execute = AsyncMock(return_value=mock_db_res)

    with patch("app.main.ask_gemini", mock_llm), patch("app.main.execute_query", mock_execute):
        resp = client.post(
            "/internal/v1/analytics",
            headers={"Authorization": f"Bearer {token}"},
            json={"prompt": "Top 5 bạn đọc quý 4/2026", "reference_time": "2026-11-21T12:00:00+07:00"},
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "SUCCESS"
    assert "LIMIT 5" in data["sql"]
    assert len(data["columns"]) == 2
    assert len(data["rows"]) == 5
    assert data["rows"][0][0] == "Nguyễn Văn An"
    assert data["rows"][0][1] == 7
    assert data["truncated"] is False


def test_endpoint_db_timeout_returns_504(override_jwt_secret):
    """When database times out (statement_timeout 2s), endpoint returns 504 AI_TIMEOUT."""
    token = create_test_jwt()
    valid_sql = "SELECT * FROM v_loan_analytics"
    mock_llm = AsyncMock(return_value=LlmAnswer(status="OK", sql=valid_sql))
    mock_execute = AsyncMock(side_effect=DbTimeoutError("Query timed out"))

    with patch("app.main.ask_gemini", mock_llm), patch("app.main.execute_query", mock_execute):
        resp = client.post(
            "/internal/v1/analytics",
            headers={"Authorization": f"Bearer {token}"},
            json={"prompt": "Liệt kê toàn bộ", "reference_time": "2026-11-21T12:00:00+07:00"},
        )

    assert resp.status_code == 504
    data = resp.json()["detail"]
    assert data["code"] == "AI_TIMEOUT"
