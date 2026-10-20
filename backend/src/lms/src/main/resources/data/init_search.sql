CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- PostgreSQL unaccent() is STABLE. An IMMUTABLE wrapper is required for index expressions and generated columns.
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
  RETURNS text AS
$$
SELECT unaccent(replace(replace($1, 'đ', 'd'), 'Đ', 'D'));
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE;

CREATE OR REPLACE FUNCTION immutable_unaccent(varchar)
  RETURNS text AS
$$
SELECT unaccent(replace(replace($1::text, 'đ', 'd'), 'Đ', 'D'));
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE;

-- Prefix tsquery helper function:
-- Converts input text (with or without accents) into prefix tsquery tokens:
-- e.g. 'lập tr' -> 'lap:* & tr:*'
CREATE OR REPLACE FUNCTION vi_to_prefix_tsquery(q text)
RETURNS tsquery AS $$
DECLARE
    cleaned text;
    formatted text;
BEGIN
    IF q IS NULL OR trim(q) = '' THEN
        RETURN NULL;
    END IF;

    -- Strip accents and lowercase
    cleaned := lower(immutable_unaccent(trim(q)));

    -- Replace non-alphanumeric characters with space
    cleaned := regexp_replace(cleaned, '[^a-z0-9]+', ' ', 'g');
    cleaned := trim(cleaned);

    IF cleaned = '' THEN
        RETURN NULL;
    END IF;

    -- Append :* to each token and join with &
    formatted := regexp_replace(cleaned, '\s+', ':* & ', 'g') || ':*';

    RETURN to_tsquery('simple', formatted);
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- GIN index for Full-Text Search on Book title, subtitle, and description
CREATE INDEX IF NOT EXISTS idx_book_fts ON book USING gin (
    to_tsvector('simple', immutable_unaccent(title || ' ' || coalesce(subtitle, '') || ' ' || coalesce(description, '')))
);

-- GIN trigram index for fuzzy matching / typo tolerance on Book title
CREATE INDEX IF NOT EXISTS idx_book_title_trgm ON book USING gin (
    immutable_unaccent(title) gin_trgm_ops
);

-- GIN trigram index on Author name
CREATE INDEX IF NOT EXISTS idx_author_name_trgm ON author USING gin (
    immutable_unaccent(name) gin_trgm_ops
);

-- GIN FTS index on Author name
CREATE INDEX IF NOT EXISTS idx_author_name_fts ON author USING gin (
    to_tsvector('simple', immutable_unaccent(name))
);
