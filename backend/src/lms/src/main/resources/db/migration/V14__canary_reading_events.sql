-- Hành vi của người đọc trên bản PDF canary: mở, đóng, tải lại và các thao tác đáng ngờ.
-- Tách khỏi canary_access (chỉ ghi lượt tải byte) để admin đọc được "người dùng đã làm gì"
-- mà không làm nhiễu thống kê lượt đọc / số IP.

CREATE TABLE IF NOT EXISTS canary_reading_event (
    id          BIGSERIAL PRIMARY KEY,
    token_id    UUID        NOT NULL REFERENCES canary_token (id) ON DELETE CASCADE,
    event       VARCHAR(20) NOT NULL,
    detail      VARCHAR(160),
    ip_address  VARCHAR(45),
    ua_hash     VARCHAR(64),
    occurred_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_canary_reading_event_token
    ON canary_reading_event (token_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_canary_reading_event_type
    ON canary_reading_event (event, occurred_at DESC);
