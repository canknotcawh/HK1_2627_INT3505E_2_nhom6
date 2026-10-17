CREATE TABLE author (
    id    UUID         PRIMARY KEY,
    name  VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE category (
    id    UUID         PRIMARY KEY,
    name  VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE book (
    id                UUID          PRIMARY KEY,
    isbn13            VARCHAR(13)   UNIQUE,
    title             VARCHAR(500)  NOT NULL,
    subtitle          VARCHAR(500),
    description       TEXT,
    language          VARCHAR(10),
    published_year    INTEGER,
    page_count        INTEGER,
    cover_image_url   VARCHAR(1000),
    preview_url       VARCHAR(1000),
    reader_url        VARCHAR(1000),
    total_copies      INTEGER       NOT NULL DEFAULT 0,
    available_copies  INTEGER       NOT NULL DEFAULT 0,
    rating_avg        NUMERIC(3, 2) NOT NULL DEFAULT 0,
    rating_count      INTEGER       NOT NULL DEFAULT 0,
    borrow_count      INTEGER       NOT NULL DEFAULT 0,
    status            VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT ck_book_copies  CHECK (total_copies >= 0 AND available_copies >= 0 AND available_copies <= total_copies),
    CONSTRAINT ck_book_rating  CHECK (rating_avg >= 0 AND rating_avg <= 5 AND rating_count >= 0),
    CONSTRAINT ck_book_borrows CHECK (borrow_count >= 0)
);

CREATE INDEX idx_book_status_title ON book (status, title);
CREATE INDEX idx_book_published_year ON book (published_year);
CREATE INDEX idx_book_rating_avg ON book (rating_avg);
CREATE INDEX idx_book_borrow_count ON book (borrow_count);

CREATE TABLE book_author (
    book_id    UUID NOT NULL REFERENCES book (id) ON DELETE CASCADE,
    author_id  UUID NOT NULL REFERENCES author (id),
    PRIMARY KEY (book_id, author_id)
);
CREATE INDEX idx_book_author_author ON book_author (author_id);

CREATE TABLE book_category (
    book_id      UUID NOT NULL REFERENCES book (id) ON DELETE CASCADE,
    category_id  UUID NOT NULL REFERENCES category (id),
    PRIMARY KEY (book_id, category_id)
);
CREATE INDEX idx_book_category_category ON book_category (category_id);

CREATE TABLE loan (
    id             UUID         PRIMARY KEY,
    book_id        UUID         NOT NULL REFERENCES book (id),
    user_id        UUID         NOT NULL REFERENCES app_user (id),
    borrowed_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    due_at         TIMESTAMPTZ  NOT NULL,
    returned_at    TIMESTAMPTZ,
    status         VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    renewed_count  INTEGER      NOT NULL DEFAULT 0,
    CONSTRAINT ck_loan_renewed CHECK (renewed_count >= 0)
);

CREATE INDEX idx_loan_user_status ON loan (user_id, status);
CREATE INDEX idx_loan_book ON loan (book_id);
CREATE INDEX idx_loan_status_due ON loan (status, due_at);
-- A user may hold at most one open loan per book (also enforced in LoanServiceImpl).
CREATE UNIQUE INDEX uq_loan_open_per_user_book ON loan (user_id, book_id) WHERE status IN ('ACTIVE', 'OVERDUE');
