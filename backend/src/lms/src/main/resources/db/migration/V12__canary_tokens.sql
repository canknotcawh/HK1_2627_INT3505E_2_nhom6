-- P2: canary token cho mọi lượt đọc PDF qua backend.
-- Không lưu token thô: chỉ SHA-256 của token, kèm prefix ngắn để admin tra cứu.

CREATE TABLE IF NOT EXISTS canary_token (
    id UUID PRIMARY KEY,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    token_prefix VARCHAR(12) NOT NULL,
    book_id UUID NOT NULL REFERENCES book(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES book_file(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    loan_id UUID REFERENCES loan(id) ON DELETE SET NULL,
    purpose VARCHAR(10) NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    revoke_reason VARCHAR(100),
    revoked_by UUID REFERENCES app_user(id) ON DELETE SET NULL,
    last_seen_at TIMESTAMPTZ,
    access_count INTEGER NOT NULL DEFAULT 0,
    created_ip_hash VARCHAR(64),
    created_ua_hash VARCHAR(64),
    CONSTRAINT ck_canary_purpose CHECK (purpose IN ('READ', 'PREVIEW')),
    CONSTRAINT ck_canary_expiry CHECK (expires_at > issued_at)
);

CREATE INDEX IF NOT EXISTS idx_canary_token_book ON canary_token (book_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_canary_token_user ON canary_token (user_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_canary_token_expiry ON canary_token (expires_at);
CREATE INDEX IF NOT EXISTS idx_canary_token_prefix ON canary_token (token_prefix);

CREATE TABLE IF NOT EXISTS canary_access (
    id BIGSERIAL PRIMARY KEY,
    token_id UUID REFERENCES canary_token(id) ON DELETE SET NULL,
    accessed_at TIMESTAMPTZ NOT NULL,
    ip_hash VARCHAR(64),
    ua_hash VARCHAR(64),
    outcome VARCHAR(20) NOT NULL,
    bytes_sent BIGINT,
    range_header VARCHAR(50),
    request_id VARCHAR(64),
    CONSTRAINT ck_canary_access_outcome CHECK (outcome IN ('OK', 'EXPIRED', 'REVOKED', 'FORBIDDEN', 'NOT_FOUND'))
);

CREATE INDEX IF NOT EXISTS idx_canary_access_token ON canary_access (token_id, accessed_at DESC);
