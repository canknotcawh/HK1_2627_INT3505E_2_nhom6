"""FastAPI Application for LMS AI Reporting Assistant (ai-service)."""

import logging
from typing import Any, Dict, List, Literal, Optional
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.auth import verify_internal_token
from app.config import settings
from app.db import DbExecutionError, DbSyntaxError, DbTimeoutError, execute_query
from app.gemini_client import ask_gemini, retry_gemini_fix
from app.prompt import build_system_prompt
from app.validator import SqlInvalid, SqlRejected, validate_sql

logger = logging.getLogger("ai_service")
logging.basicConfig(level=logging.INFO)

# Hide API docs in production environment
is_prod = settings.environment.lower() == "production"
app = FastAPI(
    title="LMS AI Reporting Service",
    version="1.0.0",
    docs_url=None if is_prod else "/docs",
    redoc_url=None if is_prod else "/redoc",
    openapi_url=None if is_prod else "/openapi.json",
)


class AnalyticsRequest(BaseModel):
    """Incoming request from Spring Boot Gateway."""
    prompt: str = Field(..., description="Natural language prompt from admin")
    reference_time: str = Field(..., description="Deterministic ISO-8601 timestamp with +07:00")
    request_id: Optional[str] = Field(default=None, description="Correlation ID for tracing")


class ColumnDto(BaseModel):
    name: str
    type: Literal["number", "datetime", "text", "uuid", "boolean", "other"]


class AnalyticsResponse(BaseModel):
    """Standardized response contract for reporting analytics."""
    status: Literal["SUCCESS", "OUT_OF_SCOPE"]
    sql: Optional[str] = None
    columns: List[ColumnDto] = Field(default_factory=list)
    rows: List[List[Any]] = Field(default_factory=list)
    truncated: bool = False
    time_grain: Optional[str] = None
    message: Optional[str] = None


@app.get("/health")
async def health_check():
    """Service health check."""
    return {"status": "UP", "environment": settings.environment}


@app.post("/internal/v1/analytics", response_model=AnalyticsResponse)
async def handle_analytics_request(
    request: AnalyticsRequest,
    caller_token: Dict[str, Any] = Depends(verify_internal_token),
):
    """Processes natural language analytics question and executes read-only SQL.
    
    Security flow:
        1. Validate request payload length.
        2. Verify Internal JWT claims (issuer, audience, scope, role, TTL).
        3. Build system instruction with schema, time boundaries, few-shots.
        4. Query Gemini model (with 1 retry on syntax error).
        5. AST Validation: allowlist, forbid dynamic functions/literals, limit <= 101.
        6. Execute regenerated SQL using lms_readonly role.
        7. Format and return response.
    """
    prompt_text = request.prompt.strip()
    if not prompt_text or len(prompt_text) > 1000:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "BAD_PROMPT", "message": "Câu hỏi không được rỗng và không vượt quá 1000 ký tự."},
        )

    # 1. Build dynamic system prompt
    system_prompt = build_system_prompt(request.reference_time)

    # 2. Call Gemini model
    try:
        llm_answer = await ask_gemini(
            system_prompt=system_prompt,
            user_text=prompt_text,
            timeout_ms=4000,
        )
    except Exception as e:
        logger.error("Gemini invocation failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "AI_UNAVAILABLE", "message": f"Dịch vụ AI tạm thời gián đoạn: {e}"},
        )

    # 3. Handle OUT_OF_SCOPE directly
    if llm_answer.status == "OUT_OF_SCOPE" or not llm_answer.sql:
        return AnalyticsResponse(
            status="OUT_OF_SCOPE",
            sql=None,
            columns=[],
            rows=[],
            truncated=False,
            time_grain=None,
            message=llm_answer.message or "Câu hỏi nằm ngoài phạm vi báo cáo phân tích thư viện.",
        )

    raw_sql = llm_answer.sql.strip()

    # 4. AST Validation & Sanity checks
    validation_res = None
    try:
        validation_res = validate_sql(raw_sql)
    except SqlRejected as e:
        # Rejected by security policy -> NO retry, return 400 immediately
        logger.warning("SQL rejected by AST validator: %s | Query: %s", e, raw_sql)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "REJECTED", "message": str(e), "sql": raw_sql},
        )
    except SqlInvalid as e:
        # Syntax error from Gemini -> retry once
        logger.info("SQL syntax invalid on 1st attempt: %s. Retrying with Gemini...", e)
        try:
            retry_ans = await retry_gemini_fix(
                system_prompt=system_prompt,
                user_text=prompt_text,
                error_message=str(e),
                timeout_ms=3000,
            )
            if retry_ans.status == "OUT_OF_SCOPE" or not retry_ans.sql:
                return AnalyticsResponse(
                    status="OUT_OF_SCOPE",
                    sql=None,
                    columns=[],
                    rows=[],
                    truncated=False,
                    time_grain=None,
                    message=retry_ans.message or "Câu hỏi nằm ngoài phạm vi sau khi thử lại.",
                )
            raw_sql = retry_ans.sql.strip()
            validation_res = validate_sql(raw_sql)
        except SqlRejected as rej_err:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "REJECTED", "message": str(rej_err), "sql": raw_sql},
            )
        except Exception as retry_err:
            logger.error("Failed after Gemini retry: %s", retry_err)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "INVALID_SQL", "message": f"Câu lệnh SQL sai cú pháp sau khi thử lại: {e}", "sql": raw_sql},
            )

    sanitized_sql = validation_res.sql

    # 5. Execute query in PostgreSQL using lms_readonly role
    try:
        db_result = await execute_query(sanitized_sql)
    except DbSyntaxError as db_syn_err:
        # Database reported class 42 error -> retry once with Gemini
        logger.info("Database reported syntax error (class 42): %s. Retrying with Gemini...", db_syn_err)
        try:
            retry_ans = await retry_gemini_fix(
                system_prompt=system_prompt,
                user_text=prompt_text,
                error_message=str(db_syn_err),
                timeout_ms=3000,
            )
            if retry_ans.status == "OUT_OF_SCOPE" or not retry_ans.sql:
                return AnalyticsResponse(
                    status="OUT_OF_SCOPE",
                    sql=None,
                    columns=[],
                    rows=[],
                    truncated=False,
                    time_grain=None,
                    message=retry_ans.message or "Câu hỏi nằm ngoài phạm vi sau khi thử lại.",
                )
            sanitized_sql = validate_sql(retry_ans.sql.strip()).sql
            db_result = await execute_query(sanitized_sql)
        except Exception as retry_fail:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "INVALID_SQL", "message": f"Lỗi cú pháp database: {db_syn_err}", "sql": sanitized_sql},
            )
    except DbTimeoutError as timeout_err:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail={"code": "AI_TIMEOUT", "message": str(timeout_err)},
        )
    except DbExecutionError as db_err:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "AI_UNAVAILABLE", "message": f"Không thể thực thi truy vấn: {db_err}"},
        )

    # 6. Return successful response matching contract
    return AnalyticsResponse(
        status="SUCCESS",
        sql=sanitized_sql,
        columns=[ColumnDto(name=c.name, type=c.type) for c in db_result.columns],
        rows=db_result.rows,
        truncated=db_result.truncated,
        time_grain=validation_res.time_grain,
        message=None,
    )
