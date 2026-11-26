-- Security audit log for tracking suspicious client-side events (leak prevention telemetry)
CREATE TABLE IF NOT EXISTS security_event_log (
    id UUID PRIMARY KEY,
    user_id UUID,
    user_email VARCHAR(255) NOT NULL DEFAULT 'anonymous',
    event_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    page_url VARCHAR(1000),
    book_id UUID,
    book_title VARCHAR(500),
    details TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT fk_security_event_user FOREIGN KEY (user_id) REFERENCES app_user (id) ON DELETE SET NULL,
    CONSTRAINT ck_security_event_type CHECK (event_type IN (
        'DEVTOOLS_DETECTED',
        'WATERMARK_TAMPERED',
        'SHORTCUT_BLOCKED',
        'CONTEXT_MENU_BLOCKED',
        'PREVIEW_FOCUS_LOST',
        'PRINT_ATTEMPT'
    )),
    CONSTRAINT ck_security_event_severity CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))
);

CREATE INDEX IF NOT EXISTS idx_security_event_created_at
    ON security_event_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_event_user_created
    ON security_event_log (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_event_type_created
    ON security_event_log (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_event_severity_created
    ON security_event_log (severity, created_at DESC);

