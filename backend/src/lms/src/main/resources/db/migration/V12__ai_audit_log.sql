-- Migration V12: Audit log table for AI report requests

CREATE TABLE IF NOT EXISTS ai_audit_log (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id    UUID NOT NULL,
    admin_id      UUID NOT NULL REFERENCES app_user(id),
    prompt        TEXT NOT NULL,
    generated_sql TEXT,
    status        VARCHAR(24) NOT NULL,
    row_count     INTEGER,
    truncated     BOOLEAN,
    latency_ms    INTEGER NOT NULL,
    error_message TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_ai_audit_status CHECK (status IN (
        'SUCCESS', 'OUT_OF_SCOPE', 'REJECTED', 'INVALID_SQL',
        'AI_UNAVAILABLE', 'AI_TIMEOUT', 'RATE_LIMITED', 'QUOTA_EXCEEDED', 'ERROR'
    ))
);

-- Indexes for performance and reporting query efficiency
CREATE INDEX IF NOT EXISTS idx_ai_audit_admin_time
    ON ai_audit_log (admin_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_audit_created_at
    ON ai_audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_audit_status
    ON ai_audit_log (status, created_at DESC);

-- Ensure lms_readonly role cannot access audit logs
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'lms_readonly') THEN
        REVOKE ALL ON ai_audit_log FROM lms_readonly;
    END IF;
END
$$;
