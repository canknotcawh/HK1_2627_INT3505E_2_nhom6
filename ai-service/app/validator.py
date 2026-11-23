"""SQL AST Validator for LMS AI Reporting Assistant.

Implements strict allowlist-based AST validation using sqlglot==30.33.0.
Ensures generated SQL is safe, read-only, operates strictly on allowed views,
enforces row limit at AST level, and extracts time grain.
"""

from dataclasses import dataclass
from typing import Optional, Set
import sqlglot
from sqlglot import exp
from sqlglot.errors import ParseError
from sqlglot.optimizer.scope import Scope, traverse_scope


class SqlValidationError(Exception):
    """Base class for all SQL validation errors."""
    pass


class SqlInvalid(SqlValidationError):
    """Raised when the query is syntactically invalid or empty."""
    pass


class SqlRejected(SqlValidationError):
    """Raised when the query violates security or allowlist policies."""
    pass


@dataclass(frozen=True)
class ValidationResult:
    """Result of successful SQL validation."""
    sql: str
    time_grain: Optional[str] = None


# Allowed physical views (strictly these 3 views)
ALLOWED_TABLES: Set[str] = {
    "v_loan_analytics",
    "v_loan_category_analytics",
    "v_category_catalog",
}

# Forbidden AST statement/clause nodes (DML, DDL, session, system catalog, lock, etc.)
FORBIDDEN_NODE_TYPES = (
    # DML / DDL / Admin
    exp.Insert,
    exp.Update,
    exp.Delete,
    exp.Drop,
    exp.Alter,
    exp.Command,
    exp.Merge,
    exp.TruncateTable,
    exp.Create,
    exp.Grant,
    exp.Revoke,
    exp.Copy,
    exp.Set,
    exp.Transaction,
    exp.Commit,
    exp.Rollback,
    # SELECT ... INTO
    exp.Into,
    # Row locking (FOR UPDATE, FOR SHARE)
    exp.Lock,
    # Cursor fetch
    exp.Fetch,
    # Non-deterministic / clock-dependent functions
    exp.CurrentTimestamp,
    exp.CurrentDate,
    exp.CurrentTime,
    exp.Localtimestamp,
    exp.Localtime,
    # Session / user / system discovery functions
    exp.CurrentUser,
    exp.SessionUser,
    exp.CurrentVersion,
    # DoS functions
    exp.ExplodingGenerateSeries,
)

# Allowed function node classes (sqlglot AST expressions)
ALLOWED_FUNC_CLASSES = (
    # Aggregations
    exp.Count,
    exp.Sum,
    exp.Avg,
    exp.Min,
    exp.Max,
    exp.GroupConcat,  # STRING_AGG in PostgreSQL
    exp.ArrayAgg,
    # Window functions
    exp.Rank,
    exp.DenseRank,
    exp.RowNumber,
    exp.Lag,
    exp.Lead,
    # Date / Time
    exp.TimestampTrunc,  # DATE_TRUNC
    exp.DateTrunc,
    exp.DatetimeTrunc,
    exp.Extract,
    exp.DateDiff,
    exp.DateAdd,
    exp.DateSub,
    # Math / Numeric
    exp.Round,
    exp.Abs,
    exp.Ceil,
    exp.Floor,
    exp.Pow,
    exp.Sqrt,
    exp.Greatest,
    exp.Least,
    # String & Array
    exp.Upper,
    exp.Lower,
    exp.Trim,
    exp.Substring,
    exp.Concat,
    exp.ConcatWs,
    exp.TimeToStr,  # TO_CHAR
    exp.ArrayToString,
    # Conversion & Conditional
    exp.Cast,
    exp.TryCast,
    exp.Coalesce,
    exp.Nullif,
)

# Allowed function names when parsed as exp.Anonymous
ALLOWED_ANONYMOUS_NAMES: Set[str] = {
    "COUNT",
    "SUM",
    "AVG",
    "MIN",
    "MAX",
    "DATE_TRUNC",
    "EXTRACT",
    "DATE_PART",
    "ROUND",
    "COALESCE",
    "NULLIF",
    "STRING_AGG",
    "ARRAY_AGG",
    "ARRAY_TO_STRING",
    "RANK",
    "DENSE_RANK",
    "ROW_NUMBER",
    "LAG",
    "LEAD",
    "UPPER",
    "LOWER",
    "TRIM",
    "SUBSTRING",
    "CONCAT",
    "CONCAT_WS",
    "TO_CHAR",
    "ABS",
    "CEIL",
    "CEILING",
    "FLOOR",
    "GREATEST",
    "LEAST",
    "CAST",
}

# Forbidden dynamic date/time string literals
FORBIDDEN_DATE_LITERALS: Set[str] = {
    "now",
    "today",
    "yesterday",
    "tomorrow",
    "current_date",
    "current_time",
    "current_timestamp",
    "localtime",
    "localtimestamp",
}


def _enforce_limit(ast: exp.Expression, max_limit: int = 101) -> exp.Expression:
    """Enforces maximum limit <= max_limit (default 101) at the AST level."""
    limit_node = ast.args.get("limit")
    if limit_node is None:
        ast = ast.limit(max_limit)
    else:
        limit_val = limit_node.expression
        if isinstance(limit_val, exp.Literal) and limit_val.is_number:
            val = int(limit_val.this)
            if val > max_limit:
                limit_node.set("expression", exp.Literal.number(max_limit))
        else:
            limit_node.set("expression", exp.Literal.number(max_limit))
    return ast


def _extract_time_grain(ast: exp.Expression) -> Optional[str]:
    """Extracts time grain if exactly one distinct DATE_TRUNC unit is used."""
    units = set()
    for node in ast.find_all((exp.TimestampTrunc, exp.DateTrunc, exp.DatetimeTrunc)):
        unit = node.text("unit")
        if not unit and node.args.get("unit"):
            unit = getattr(node.args["unit"], "name", None) or str(node.args["unit"])
        if unit:
            cleaned = unit.strip().strip("'\"").lower()
            if cleaned:
                units.add(cleaned)
    if len(units) == 1:
        return next(iter(units))
    return None


def validate_sql(sql_str: str) -> ValidationResult:
    """Validates an SQL query against security allowlists and returns sanitized SQL and time grain.
    
    Args:
        sql_str: Raw SQL string generated by LLM.
        
    Returns:
        ValidationResult with regenerated SQL string (enforcing LIMIT <= 101) and optional time_grain.
        
    Raises:
        SqlInvalid: When SQL syntax is invalid or query is empty.
        SqlRejected: When SQL violates allowlist, uses forbidden nodes, tables, functions, or literals.
    """
    if not sql_str or not sql_str.strip():
        raise SqlInvalid("Câu lệnh SQL rỗng.")

    # 1. Parse SQL statement
    try:
        statements = sqlglot.parse(sql_str.strip(), read="postgres")
    except ParseError as e:
        raise SqlInvalid(f"Lỗi cú pháp SQL: {e}") from e
    except Exception as e:
        raise SqlInvalid(f"Không thể phân tích cú pháp SQL: {e}") from e

    if not statements or statements[0] is None:
        raise SqlInvalid("Không tìm thấy câu lệnh SQL hợp lệ.")

    if len(statements) > 1:
        raise SqlRejected("Chỉ cho phép thực thi đúng một câu lệnh SQL duy nhất.")

    ast = statements[0]

    # 2. Check root statement type (Must be SELECT or set operations UNION/INTERSECT/EXCEPT)
    if not isinstance(ast, (exp.Select, exp.Union, exp.Intersect, exp.Except)):
        raise SqlRejected(
            f"Gốc câu lệnh phải là SELECT hoặc toán tử tập hợp, nhận được: {type(ast).__name__}"
        )

    # 3. Check for explicitly forbidden AST nodes
    for node in ast.find_all(exp.Expression):
        if isinstance(node, FORBIDDEN_NODE_TYPES):
            raise SqlRejected(
                f"Phát hiện cú pháp hoặc hàm bị cấm: {type(node).__name__} ({node.sql(dialect='postgres')})"
            )

        # 4. Check function security
        if isinstance(node, exp.Func) and not isinstance(node, (exp.Binary, exp.Unary)):
            # Check schema-qualified function (e.g. pg_catalog.pg_sleep)
            parent_dot = node.find_ancestor(exp.Dot)
            if parent_dot is not None and parent_dot.expression == node:
                raise SqlRejected(f"Cấm gọi hàm có tiền tố schema/catalog: {parent_dot.sql(dialect='postgres')}")

            # Check if function is in allowed node classes
            if isinstance(node, exp.Anonymous):
                fname = (node.name or "").upper()
                if fname not in ALLOWED_ANONYMOUS_NAMES:
                    raise SqlRejected(f"Hàm không nằm trong allowlist: {node.name}")
            elif not isinstance(node, ALLOWED_FUNC_CLASSES):
                raise SqlRejected(f"Hàm không nằm trong allowlist: {type(node).__name__}")

        # 5. Check string literals for relative dynamic dates
        if isinstance(node, exp.Literal) and node.is_string:
            val = " ".join(node.this.strip().lower().split())
            if (
                val in FORBIDDEN_DATE_LITERALS
                or val.startswith(("now -", "now +", "today -", "today +"))
                or val.startswith(("yesterday -", "yesterday +"))
            ):
                raise SqlRejected(
                    f"Cấm sử dụng literal thời gian tương đối: '{node.this}'. "
                    "Hãy sử dụng các mốc thời gian ISO cố định được tiêm vào prompt."
                )

    # 6. Check tables across scopes (anti-CTE/Subquery alias bypass)
    has_table = False
    for scope in traverse_scope(ast):
        for table in scope.tables:
            has_table = True
            # Reject schema qualifications (e.g. public., pg_catalog.)
            if table.db or table.catalog:
                raise SqlRejected(f"Cấm truy cập có tiền tố schema/catalog: {table.sql(dialect='postgres')}")

            tname = table.name.lower()
            source = scope.sources.get(tname)
            # If source is a Scope, this is an internal CTE or derived table alias
            if isinstance(source, Scope):
                continue
            # Physical table/view must be in allowlist
            if tname not in ALLOWED_TABLES:
                raise SqlRejected(f"Bảng/View không nằm trong danh mục cho phép: {tname}")

    if not has_table:
        # A valid analytical report query must query at least one allowed analytical view
        raise SqlRejected("Truy vấn báo cáo bắt buộc phải đọc từ ít nhất một View phân tích được phép.")

    # 7. Extract time grain before modifying limit
    time_grain = _extract_time_grain(ast)

    # 8. Enforce LIMIT <= 101 at AST level
    ast = _enforce_limit(ast, max_limit=101)

    # 9. Regenerate clean SQL from sanitized AST
    regenerated_sql = ast.sql(dialect="postgres")

    return ValidationResult(sql=regenerated_sql, time_grain=time_grain)
