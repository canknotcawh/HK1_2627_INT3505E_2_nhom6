-- Existing accounts remain usable after email verification is introduced.
-- New rows default to unverified; new Google sign-ins will set the value from
-- Google's verified email claim in the auth service.
ALTER TABLE app_user
    ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE app_user
SET email_verified = TRUE;

CREATE TABLE email_verification_challenge (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES app_user(id) ON DELETE CASCADE,
    otp_hash VARCHAR(64) NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    last_sent_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT ck_email_verification_failed_attempts CHECK (failed_attempts >= 0),
    CONSTRAINT ck_email_verification_otp_hash_length CHECK (length(otp_hash) = 64),
    CONSTRAINT ck_email_verification_token_hash_length CHECK (length(token_hash) = 64)
);

CREATE INDEX idx_email_verification_challenge_expires_at
    ON email_verification_challenge(expires_at);
