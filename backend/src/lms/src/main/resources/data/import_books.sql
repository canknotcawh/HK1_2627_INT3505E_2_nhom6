\set ON_ERROR_STOP on
\encoding UTF8

BEGIN;

CREATE TEMP TABLE stg_books (
    isbn13 text, title text, subtitle text, authors text, categories text,
    published_year text, language text, page_count text, description text,
    cover_image_url text, rating_avg text, rating_count text, total_copies text
) ON COMMIT DROP;

\copy stg_books FROM 'books.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')

CREATE TEMP TABLE stg_ok ON COMMIT DROP AS
SELECT DISTINCT ON (isbn13)
       isbn13,
       title,
       subtitle,
       authors,
       categories,
       description,
       cover_image_url,
       language,
       published_year,
       page_count,
       rating_avg,
       rating_count,
       total_copies
FROM (
    SELECT regexp_replace(btrim(isbn13), '[-\s]', '', 'g')                                   AS isbn13,
           btrim(title)                                                                       AS title,
           nullif(btrim(subtitle), '')                                                        AS subtitle,
           coalesce(btrim(authors), '')                                                       AS authors,
           coalesce(btrim(categories), '')                                                    AS categories,
           nullif(btrim(description), '')                                                     AS description,
           nullif(btrim(cover_image_url), '')                                                 AS cover_image_url,
           nullif(left(btrim(language), 10), '')                                              AS language,
           CASE WHEN btrim(published_year) ~ '^\d{4}$'
                 AND btrim(published_year)::int BETWEEN 1000 AND extract(year FROM now())::int + 1
                THEN btrim(published_year)::int END                                           AS published_year,
           CASE WHEN btrim(page_count) ~ '^\d+$' THEN btrim(page_count)::int END              AS page_count,
           CASE WHEN btrim(rating_avg) ~ '^\d+(\.\d+)?$'
                 AND btrim(rating_avg)::numeric BETWEEN 0 AND 5
                THEN round(btrim(rating_avg)::numeric, 2) ELSE 0 END                          AS rating_avg,
           CASE WHEN btrim(rating_count) ~ '^\d+$' THEN btrim(rating_count)::int ELSE 0 END   AS rating_count,
           CASE WHEN btrim(total_copies) ~ '^\d+$' THEN btrim(total_copies)::int ELSE 3 END   AS total_copies
    FROM stg_books
) s
WHERE isbn13 ~ '^\d{13}$' AND title <> ''
ORDER BY isbn13;

DO $$
DECLARE total int; ok int;
BEGIN
    SELECT count(*) INTO total FROM stg_books;
    SELECT count(*) INTO ok FROM stg_ok;
    RAISE NOTICE 'CSV rows: %, valid unique books: %, skipped (bad isbn13/blank title/duplicate): %', total, ok, total - ok;
END $$;

INSERT INTO author (id, name)
SELECT gen_random_uuid(), n
FROM (SELECT DISTINCT btrim(x) AS n
      FROM stg_ok, regexp_split_to_table(authors, ';') AS x) t
WHERE n <> ''
ON CONFLICT (name) DO NOTHING;

INSERT INTO category (id, name)
SELECT gen_random_uuid(), n
FROM (SELECT DISTINCT btrim(x) AS n
      FROM stg_ok, regexp_split_to_table(categories, ';') AS x) t
WHERE n <> ''
ON CONFLICT (name) DO NOTHING;

INSERT INTO book (id, isbn13, title, subtitle, description, language, published_year, page_count,
                  cover_image_url, total_copies, available_copies, rating_avg, rating_count, borrow_count, status, created_at, updated_at)
SELECT gen_random_uuid(), isbn13, title, subtitle, description, language, published_year, page_count,
       cover_image_url, total_copies, total_copies, rating_avg, rating_count, 0, 'ACTIVE', now(), now()
FROM stg_ok
ON CONFLICT (isbn13) DO UPDATE SET
    title           = EXCLUDED.title,
    subtitle        = EXCLUDED.subtitle,
    description     = EXCLUDED.description,
    language        = EXCLUDED.language,
    published_year  = EXCLUDED.published_year,
    page_count      = EXCLUDED.page_count,
    cover_image_url = EXCLUDED.cover_image_url,
    rating_avg      = EXCLUDED.rating_avg,
    rating_count    = EXCLUDED.rating_count,
    updated_at      = now();

DELETE FROM book_author   WHERE book_id IN (SELECT b.id FROM book b JOIN stg_ok s USING (isbn13));
DELETE FROM book_category WHERE book_id IN (SELECT b.id FROM book b JOIN stg_ok s USING (isbn13));

INSERT INTO book_author (book_id, author_id)
SELECT DISTINCT b.id, a.id
FROM stg_ok s
JOIN book b ON b.isbn13 = s.isbn13
CROSS JOIN LATERAL regexp_split_to_table(s.authors, ';') AS x
JOIN author a ON a.name = btrim(x);

INSERT INTO book_category (book_id, category_id)
SELECT DISTINCT b.id, c.id
FROM stg_ok s
JOIN book b ON b.isbn13 = s.isbn13
CROSS JOIN LATERAL regexp_split_to_table(s.categories, ';') AS x
JOIN category c ON c.name = btrim(x);

COMMIT;

SELECT (SELECT count(*) FROM book)     AS books,
       (SELECT count(*) FROM author)   AS authors,
       (SELECT count(*) FROM category) AS categories;
