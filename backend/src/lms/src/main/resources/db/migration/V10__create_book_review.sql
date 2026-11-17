-- Book reviews (entity BookReview). One review per user per book; rows are soft-deleted
-- through the status column (VISIBLE, HIDDEN_BY_ADMIN, DELETED).
CREATE TABLE IF NOT EXISTS book_review (
    id UUID PRIMARY KEY,
    book_id UUID NOT NULL,
    user_id UUID NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT fk_book_review_book FOREIGN KEY (book_id) REFERENCES book (id) ON DELETE CASCADE,
    CONSTRAINT fk_book_review_user FOREIGN KEY (user_id) REFERENCES app_user (id),
    CONSTRAINT uq_book_review_book_user UNIQUE (book_id, user_id),
    CONSTRAINT ck_book_review_rating CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT ck_book_review_status CHECK (status IN ('VISIBLE', 'HIDDEN_BY_ADMIN', 'DELETED'))
);

CREATE INDEX IF NOT EXISTS idx_book_review_book_status_created
    ON book_review (book_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_book_review_user
    ON book_review (user_id);
