CREATE TABLE preview_budget (
    reader VARCHAR(42) NOT NULL,
    book_id UUID NOT NULL REFERENCES book(id) ON DELETE CASCADE,
    remaining_ms INTEGER NOT NULL CHECK (remaining_ms BETWEEN 0 AND 180000),
    accounted_at BIGINT NOT NULL,
    PRIMARY KEY (reader, book_id)
);

CREATE TABLE preview_tab (
    reader VARCHAR(42) NOT NULL,
    book_id UUID NOT NULL,
    tab_id UUID NOT NULL,
    valid_until BIGINT NOT NULL,
    PRIMARY KEY (reader, book_id, tab_id),
    FOREIGN KEY (reader, book_id) REFERENCES preview_budget ON DELETE CASCADE
);
