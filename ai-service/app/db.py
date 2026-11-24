"""PostgreSQL database executor for ai-service using lms_readonly role."""

from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

import psycopg
from psycopg.rows import tuple_row
from app.config import settings


# Mapping of PostgreSQL data type OIDs to contract type strings
# Contract types: number, datetime, text, uuid, boolean, other
OID_TYPE_MAP: Dict[int, str] = {
    # Number
    20: "number",    # int8 / bigint
    21: "number",    # int2 / smallint
    23: "number",    # int4 / integer
    700: "number",   # float4 / real
    701: "number",   # float8 / double precision
    1700: "number",  # numeric / decimal
    # Datetime
    1082: "datetime",  # date
    1114: "datetime",  # timestamp without tz
    1184: "datetime",  # timestamptz
    # Text
    25: "text",    # text
    1042: "text",  # bpchar
    1043: "text",  # varchar
    # UUID
    2950: "uuid",  # uuid
    # Boolean
    16: "boolean",  # bool
}


def get_column_type(type_code: Optional[int]) -> str:
    """Returns the contract column type based on PostgreSQL OID."""
    if type_code is None:
        return "other"
    return OID_TYPE_MAP.get(type_code, "other")


def serialize_value(val: Any) -> Any:
    """Serializes database values into JSON-compliant representations."""
    if val is None:
        return None
    if isinstance(val, Decimal):
        # Convert to int if whole number, otherwise float
        return int(val) if val % 1 == 0 else float(val)
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    if isinstance(val, UUID):
        return str(val)
    if isinstance(val, (list, tuple)):
        return [serialize_value(item) for item in val]
    return val


@dataclass(frozen=True)
class ColumnInfo:
    """Column metadata for API response."""
    name: str
    type: str

    def to_dict(self) -> Dict[str, str]:
        return {"name": self.name, "type": self.type}


@dataclass(frozen=True)
class QueryExecutionResult:
    """Structured result of executing a validated SQL query."""
    columns: List[ColumnInfo]
    rows: List[List[Any]]
    truncated: bool


class DbExecutionError(Exception):
    """Base exception for database execution failures."""
    def __init__(self, message: str, sqlstate: Optional[str] = None):
        super().__init__(message)
        self.sqlstate = sqlstate


class DbSyntaxError(DbExecutionError):
    """Raised when query has syntax error or invalid column/table (recoverable class 42 errors)."""
    pass


class DbPermissionError(DbExecutionError):
    """Raised when query violates access rules (SQLSTATE 42501 permission denied) - security issue, no retry."""
    pass


class DbTimeoutError(DbExecutionError):
    """Raised when statement timeout is exceeded (SQLSTATE 57014)."""
    pass


async def execute_query(sql_query: str, db_url: Optional[str] = None) -> QueryExecutionResult:
    """Executes a sanitized SQL query using the read-only PostgreSQL role.
    
    Args:
        sql_query: Sanitized SQL query (with LIMIT <= 101 enforced).
        db_url: Optional connection string (defaults to settings.database_url).
        
    Returns:
        QueryExecutionResult with columns, rows, and truncated status.
        
    Raises:
        DbSyntaxError: If PostgreSQL reports syntax or catalog reference error (class 42).
        DbTimeoutError: If query execution exceeds statement timeout (57014).
        DbExecutionError: For other execution failures.
    """
    url = db_url or settings.effective_database_url

    try:
        async with await psycopg.AsyncConnection.connect(url, connect_timeout=3) as aconn:
            async with aconn.cursor(row_factory=tuple_row) as cur:
                # Enforce execution timeout in session as a second defense line (2000ms)
                await cur.execute("SET statement_timeout = '2000'")
                await cur.execute(sql_query)

                # Extract column metadata from cursor description
                description = cur.description or []
                columns = [
                    ColumnInfo(name=col.name, type=get_column_type(col.type_code))
                    for col in description
                ]

                # Fetch up to 101 rows to detect truncation
                raw_rows = await cur.fetchmany(101)

                truncated = False
                if len(raw_rows) > 100:
                    truncated = True
                    raw_rows = raw_rows[:100]

                # Serialize all values for JSON serialization
                serialized_rows = [
                    [serialize_value(val) for val in row]
                    for row in raw_rows
                ]

                return QueryExecutionResult(
                    columns=columns,
                    rows=serialized_rows,
                    truncated=truncated,
                )

    except psycopg.errors.QueryCanceled as e:
        raise DbTimeoutError("Truy vấn vượt quá thời gian thực thi cho phép (statement timeout 2s).", sqlstate="57014") from e
    except psycopg.Error as e:
        sqlstate = getattr(e, "sqlstate", None) or ""
        # SQLSTATE 42501: insufficient_privilege / permission denied -> Security violation, DO NOT retry
        if sqlstate == "42501":
            raise DbPermissionError(f"Từ chối quyền truy cập CSDL ({sqlstate}): {e}", sqlstate=sqlstate) from e
        # Specific recoverable class 42 errors:
        # 42601: syntax_error, 42703: undefined_column, 42P01: undefined_table, 42883: undefined_function
        if sqlstate in ("42601", "42703", "42P01", "42883"):
            raise DbSyntaxError(f"Lỗi cú pháp hoặc định danh CSDL ({sqlstate}): {e}", sqlstate=sqlstate) from e
        raise DbExecutionError(f"Lỗi thực thi cơ sở dữ liệu ({sqlstate}): {e}", sqlstate=sqlstate) from e
