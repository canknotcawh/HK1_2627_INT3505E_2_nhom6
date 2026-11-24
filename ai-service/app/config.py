"""Application configuration and settings for ai-service."""

import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator


class Settings(BaseSettings):
    """Configuration loaded from environment variables or .env file."""

    database_url: str = Field(
        default="postgresql://lms_readonly:lms_readonly_dev_pass@localhost:5433/lms",
        alias="DATABASE_URL",
        description="Connection URL for PostgreSQL using lms_readonly role",
    )
    internal_jwt_secret: str = Field(
        default="lms_internal_jwt_super_secret_key_32_bytes_min!",
        alias="INTERNAL_JWT_SECRET",
        description="Shared secret for validating Internal JWTs from Spring Boot Gateway",
    )
    gemini_api_key: str = Field(
        default="",
        alias="GEMINI_API_KEY",
        description="Google AI Studio Gemini API Key",
    )
    gemini_model: str = Field(
        default="gemini-2.5-flash",
        alias="GEMINI_MODEL",
        description="Gemini model name to use for Text-to-SQL generation",
    )
    environment: str = Field(
        default="development",
        alias="ENVIRONMENT",
        description="Application environment: development, test, or production",
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("internal_jwt_secret")
    @classmethod
    def validate_jwt_secret_length(cls, v: str) -> str:
        if len(v.encode("utf-8")) < 32:
            raise ValueError("INTERNAL_JWT_SECRET must be at least 32 bytes long for secure HMAC-SHA256 signing.")
        return v


settings = Settings()
