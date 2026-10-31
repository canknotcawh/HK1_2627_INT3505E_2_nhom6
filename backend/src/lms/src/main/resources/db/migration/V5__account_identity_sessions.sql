-- Additive identity tables/columns. Apply only after the existing schema has been
-- inspected and Flyway baseline/history has been established for that database.
ALTER TABLE app_user
    ADD COLUMN IF NOT EXISTS profile_name_managed BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS password_reset_requested_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS auth_refresh_session (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    family_id UUID NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    replaced_by_id UUID
);

CREATE INDEX IF NOT EXISTS idx_auth_refresh_session_user_active
    ON auth_refresh_session(user_id, expires_at)
    WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_auth_refresh_session_family
    ON auth_refresh_session(family_id);

CREATE TABLE IF NOT EXISTS password_reset_token (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_password_reset_token_user
    ON password_reset_token(user_id);
