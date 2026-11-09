-- Restore and complete the book catalog schema.

-- Book columns required by the current Book entity.
ALTER TABLE book
    ADD COLUMN IF NOT EXISTS subtitle VARCHAR(500),
    ADD COLUMN IF NOT EXISTS rating_avg NUMERIC(3, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS rating_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS borrow_count INTEGER NOT NULL DEFAULT 0;

-- Author entity.
CREATE TABLE IF NOT EXISTS author (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE
);

-- Category entity.
CREATE TABLE IF NOT EXISTS category (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- Book <-> Author many-to-many relationship.
CREATE TABLE IF NOT EXISTS book_author (
    book_id UUID NOT NULL REFERENCES book(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES author(id) ON DELETE CASCADE,
    PRIMARY KEY (book_id, author_id)
);

-- Book <-> Category many-to-many relationship.
CREATE TABLE IF NOT EXISTS book_category (
    book_id UUID NOT NULL REFERENCES book(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES category(id) ON DELETE CASCADE,
    PRIMARY KEY (book_id, category_id)
);
