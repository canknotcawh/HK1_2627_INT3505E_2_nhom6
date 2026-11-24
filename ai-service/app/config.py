"""Application configuration and settings for ai-service."""

import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator


class Settings(BaseSettings):
    """Configuration loaded from environment variables or .env file."""

    database_url: Optional[str] = Field(
        default=None,
        alias="DATABASE_URL",
        description="Connection URL for PostgreSQL using lms_readonly role",
    )
    db_host: str = Field(default="localhost", alias="DB_HOST")
    db_port: int = Field(default=5433, alias="DB_PORT")
    db_name: str = Field(default="lms", alias="DB_NAME")
    db_user: str = Field(default="lms_readonly", alias="DB_USER")
    db_password: str = Field(default="lms_readonly_dev_pass", alias="DB_PASSWORD")

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
        default="gemini-3.8-flash",
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

    @property
    def effective_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        return f"postgresql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"


settings = Settings()
