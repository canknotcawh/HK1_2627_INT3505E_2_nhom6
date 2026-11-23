-- P0/P1: PDF gốc của sách (không bao giờ public) thay cho hai cột URL "ma".
-- Mỗi sách tối đa 1 bản PREVIEW + 1 bản FULL đang ACTIVE; bản cũ được ARCHIVED
-- chứ không xoá vật lý để token đã cấp vẫn còn tham chiếu khi điều tra.

CREATE TABLE IF NOT EXISTS book_file (
    id UUID PRIMARY KEY,
    book_id UUID NOT NULL REFERENCES book(id) ON DELETE CASCADE,
    kind VARCHAR(10) NOT NULL,
    storage_key VARCHAR(500) NOT NULL UNIQUE,
    original_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    sha256 VARCHAR(64) NOT NULL,
    page_count INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_by UUID REFERENCES app_user(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    archived_at TIMESTAMPTZ,
    CONSTRAINT ck_book_file_kind CHECK (kind IN ('PREVIEW', 'FULL')),
    CONSTRAINT ck_book_file_status CHECK (status IN ('ACTIVE', 'ARCHIVED')),
    CONSTRAINT ck_book_file_size CHECK (size_bytes > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_book_file_active_kind
    ON book_file (book_id, kind)
    WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_book_file_book ON book_file (book_id, created_at DESC);

-- Hai cột này chưa từng được entity map và không có API nào ghi/đọc giá trị.
ALTER TABLE book
    DROP COLUMN IF EXISTS preview_url,
    DROP COLUMN IF EXISTS reader_url;
