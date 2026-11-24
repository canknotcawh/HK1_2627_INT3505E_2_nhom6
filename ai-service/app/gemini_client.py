"""Gemini API client wrapper for Text-to-SQL generation using google-genai SDK."""

import asyncio
from typing import Literal, Optional
from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from app.config import settings


class LlmAnswer(BaseModel):
    """Schema returned by Gemini LLM."""
    status: Literal["OK", "OUT_OF_SCOPE"]
    sql: Optional[str] = Field(default=None, description="The generated PostgreSQL query if status is OK")
    message: Optional[str] = Field(default=None, description="Explanation message if status is OUT_OF_SCOPE")


def get_genai_client() -> Optional[genai.Client]:
    """Returns an initialized google-genai Client or None if API key is not configured."""
    if not settings.gemini_api_key:
        return None
    return genai.Client(api_key=settings.gemini_api_key)


async def ask_gemini(
    system_prompt: str,
    user_text: str,
    timeout_ms: int = 4000,
    client: Optional[genai.Client] = None,
) -> LlmAnswer:
    """Invokes Gemini model to generate SQL from user question.
    
    Args:
        system_prompt: System instruction containing rules, schema, few-shots.
        user_text: The user's natural language question.
        timeout_ms: HTTP timeout in milliseconds (default 4000ms).
        client: Optional genai.Client (defaults to client initialized from settings).
        
    Returns:
        LlmAnswer instance parsed from JSON response.
        
    Raises:
        RuntimeError: If Gemini API key is missing or model invocation fails.
    """
    ai_client = client or get_genai_client()
    if ai_client is None:
        raise RuntimeError("GEMINI_API_KEY is not configured. Cannot call Gemini API.")

    try:
        resp = await ai_client.aio.models.generate_content(
            model=settings.gemini_model,
            contents=user_text,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0,
                response_mime_type="application/json",
                response_schema=LlmAnswer,
                http_options=types.HttpOptions(
                    timeout=timeout_ms,
                    retry_options=types.HttpRetryOptions(attempts=1),
                ),
            ),
        )
    except Exception as e:
        raise RuntimeError(f"Lỗi khi gọi Google Gemini API: {e}") from e

    if not resp.text:
        raise RuntimeError("Gemini trả về phản hồi rỗng.")

    return LlmAnswer.model_validate_json(resp.text)


async def retry_gemini_fix(
    system_prompt: str,
    user_text: str,
    error_message: str,
    timeout_ms: int = 3000,
    client: Optional[genai.Client] = None,
) -> LlmAnswer:
    """Requests Gemini to fix an invalid SQL query exactly once.
    
    Args:
        system_prompt: Base system instruction.
        user_text: Original user question.
        error_message: Specific syntax or validation error message.
        timeout_ms: HTTP timeout for retry in milliseconds (default 3000ms).
        client: Optional genai.Client.
        
    Returns:
        New LlmAnswer instance with corrected SQL.
    """
    retry_instruction = (
        f"{user_text}\n\n"
        f"[LƯU Ý: Câu truy vấn trước đó bạn sinh ra bị lỗi: {error_message}. "
        "Hãy sửa lại câu SQL duy nhất, đảm bảo cú pháp PostgreSQL chuẩn xác và tuân thủ mọi quy tắc an toàn.]"
    )
    return await ask_gemini(
        system_prompt=system_prompt,
        user_text=retry_instruction,
        timeout_ms=timeout_ms,
        client=client,
    )
