package com.soa.gr6.lms.repository;

import com.soa.gr6.lms.domain.Book;
import com.soa.gr6.lms.domain.enums.BookStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BookRepository extends JpaRepository<Book, UUID> {
    Optional<Book> findByIsbn13(String isbn13);

    boolean existsByIsbn13(String isbn13);

    Page<Book> findByStatus(BookStatus status, Pageable pageable);

    Page<Book> findByStatusAndTitleContainingIgnoreCase(BookStatus status, String title, Pageable pageable);

    Page<Book> findByTitleContainingIgnoreCaseOrIsbn13ContainingIgnoreCase(
            String title,
            String isbn13,
            Pageable pageable);

    /**
     * Full-Text Search with prefix matching, Vietnamese unaccent, and pg_trgm fuzzy matching / typo tolerance.
     */
    @Query(value = """
        WITH candidates AS (
            SELECT b.id
            FROM book b
            WHERE vi_to_prefix_tsquery(:q) IS NOT NULL
              AND to_tsvector('simple', immutable_unaccent(b.title || ' ' || coalesce(b.subtitle, '') || ' ' || coalesce(b.description, '')))
                  @@ vi_to_prefix_tsquery(:q)
            UNION
            SELECT b.id
            FROM book b
            WHERE length(trim(:q)) >= 3
              AND immutable_unaccent(:q) <% immutable_unaccent(b.title)
            UNION
            SELECT ba.book_id
            FROM author a
            JOIN book_author ba ON ba.author_id = a.id
            WHERE vi_to_prefix_tsquery(:q) IS NOT NULL
              AND to_tsvector('simple', immutable_unaccent(a.name)) @@ vi_to_prefix_tsquery(:q)
            UNION
            SELECT ba.book_id
            FROM author a
            JOIN book_author ba ON ba.author_id = a.id
            WHERE length(trim(:q)) >= 3
              AND immutable_unaccent(:q) <% immutable_unaccent(a.name)
        ),
        scored AS (
            SELECT b2.id, MAX(
                COALESCE(ts_rank(to_tsvector('simple', immutable_unaccent(b2.title)), p.tsq), 0) * 4.0
                + COALESCE(ts_rank(to_tsvector('simple', immutable_unaccent(coalesce(b2.subtitle, '') || ' ' || coalesce(b2.description, ''))), p.tsq), 0) * 1.0
                + COALESCE(ts_rank(to_tsvector('simple', immutable_unaccent(coalesce(a2.name, ''))), p.tsq), 0) * 2.5
                + word_similarity(p.uq, immutable_unaccent(b2.title)) * 3.0
                + COALESCE(word_similarity(p.uq, immutable_unaccent(a2.name)), 0) * 2.0
            ) AS score
            FROM candidates c
            JOIN book b2 ON b2.id = c.id
            LEFT JOIN book_author ba2 ON ba2.book_id = b2.id
            LEFT JOIN author a2 ON a2.id = ba2.author_id
            CROSS JOIN (SELECT vi_to_prefix_tsquery(:q) AS tsq, immutable_unaccent(:q) AS uq) p
            WHERE b2.status = 'ACTIVE'
              AND (
                  :category IS NULL OR :category = ''
                  OR EXISTS (
                      SELECT 1 FROM book_category bc2
                      JOIN category c2 ON c2.id = bc2.category_id
                      WHERE bc2.book_id = b2.id AND c2.name = :category
                  )
              )
              AND (
                  :availability IS NULL OR :availability = '' OR :availability = 'all'
                  OR (:availability = 'available' AND b2.available_copies > 0)
                  OR (:availability = 'unavailable' AND b2.available_copies <= 0)
              )
            GROUP BY b2.id
        )
        SELECT b.*
        FROM book b
        JOIN scored s ON s.id = b.id
        ORDER BY
            CASE WHEN :sort = 'title_asc' THEN b.title END ASC NULLS LAST,
            CASE WHEN :sort = 'title_desc' THEN b.title END DESC NULLS LAST,
            CASE WHEN :sort = 'rating_desc' THEN b.rating_avg END DESC NULLS LAST,
            CASE WHEN :sort = 'rating_desc' THEN b.rating_count END DESC NULLS LAST,
            CASE WHEN :sort = 'rating_asc' THEN b.rating_avg END ASC NULLS LAST,
            CASE WHEN :sort = 'rating_count_desc' THEN b.rating_count END DESC NULLS LAST,
            CASE WHEN :sort = 'rating_count_desc' THEN b.rating_avg END DESC NULLS LAST,
            CASE WHEN :sort = 'rating_count_asc' THEN b.rating_count END ASC NULLS LAST,
            CASE WHEN :sort = 'year_desc' THEN b.published_year END DESC NULLS LAST,
            CASE WHEN :sort = 'year_asc' THEN b.published_year END ASC NULLS LAST,
            CASE WHEN :sort = 'relevance' OR :sort IS NULL OR :sort = '' THEN s.score END DESC NULLS LAST,
            b.title ASC,
            b.id ASC
        """,
        countQuery = """
        WITH candidates AS (
            SELECT b.id
            FROM book b
            WHERE vi_to_prefix_tsquery(:q) IS NOT NULL
              AND to_tsvector('simple', immutable_unaccent(b.title || ' ' || coalesce(b.subtitle, '') || ' ' || coalesce(b.description, '')))
                  @@ vi_to_prefix_tsquery(:q)
            UNION
            SELECT b.id
            FROM book b
            WHERE length(trim(:q)) >= 3
              AND immutable_unaccent(:q) <% immutable_unaccent(b.title)
            UNION
            SELECT ba.book_id
            FROM author a
            JOIN book_author ba ON ba.author_id = a.id
            WHERE vi_to_prefix_tsquery(:q) IS NOT NULL
              AND to_tsvector('simple', immutable_unaccent(a.name)) @@ vi_to_prefix_tsquery(:q)
            UNION
            SELECT ba.book_id
            FROM author a
            JOIN book_author ba ON ba.author_id = a.id
            WHERE length(trim(:q)) >= 3
              AND immutable_unaccent(:q) <% immutable_unaccent(a.name)
        )
        SELECT COUNT(*)
        FROM book b2
        WHERE b2.id IN (SELECT id FROM candidates)
          AND b2.status = 'ACTIVE'
          AND (
              :category IS NULL OR :category = ''
              OR EXISTS (
                  SELECT 1 FROM book_category bc2
                  JOIN category c2 ON c2.id = bc2.category_id
                  WHERE bc2.book_id = b2.id AND c2.name = :category
              )
          )
          AND (
              :availability IS NULL OR :availability = '' OR :availability = 'all'
              OR (:availability = 'available' AND b2.available_copies > 0)
              OR (:availability = 'unavailable' AND b2.available_copies <= 0)
          )
          AND (:sort IS NULL OR 1=1)
        """,
        nativeQuery = true)
    Page<Book> searchBooks(
            @Param("q") String q,
            @Param("category") String category,
            @Param("availability") String availability,
            @Param("sort") String sort,
            Pageable pageable);

    @Query(value = """
        SELECT b.*
        FROM book b
        WHERE b.status = 'ACTIVE'
          AND (
              :category IS NULL OR :category = ''
              OR EXISTS (
                  SELECT 1 FROM book_category bc
                  JOIN category c ON bc.category_id = c.id
                  WHERE bc.book_id = b.id AND c.name = :category
              )
          )
          AND (
              :availability IS NULL OR :availability = '' OR :availability = 'all'
              OR (:availability = 'available' AND b.available_copies > 0)
              OR (:availability = 'unavailable' AND b.available_copies <= 0)
          )
        ORDER BY
            CASE WHEN :sort = 'title_asc' THEN b.title END ASC NULLS LAST,
            CASE WHEN :sort = 'title_desc' THEN b.title END DESC NULLS LAST,
            CASE WHEN :sort = 'rating_desc' THEN b.rating_avg END DESC NULLS LAST,
            CASE WHEN :sort = 'rating_desc' THEN b.rating_count END DESC NULLS LAST,
            CASE WHEN :sort = 'rating_asc' THEN b.rating_avg END ASC NULLS LAST,
            CASE WHEN :sort = 'rating_count_desc' THEN b.rating_count END DESC NULLS LAST,
            CASE WHEN :sort = 'rating_count_desc' THEN b.rating_avg END DESC NULLS LAST,
            CASE WHEN :sort = 'rating_count_asc' THEN b.rating_count END ASC NULLS LAST,
            CASE WHEN :sort = 'year_desc' THEN b.published_year END DESC NULLS LAST,
            CASE WHEN :sort = 'year_asc' THEN b.published_year END ASC NULLS LAST,
            b.title ASC,
            b.id ASC
        """,
        countQuery = """
        SELECT COUNT(*)
        FROM book b
        WHERE b.status = 'ACTIVE'
          AND (
              :category IS NULL OR :category = ''
              OR EXISTS (
                  SELECT 1 FROM book_category bc
                  JOIN category c ON bc.category_id = c.id
                  WHERE bc.book_id = b.id AND c.name = :category
              )
          )
          AND (
              :availability IS NULL OR :availability = '' OR :availability = 'all'
              OR (:availability = 'available' AND b.available_copies > 0)
              OR (:availability = 'unavailable' AND b.available_copies <= 0)
          )
          AND (:sort IS NULL OR 1=1)
        """,
        nativeQuery = true)
    Page<Book> filterBooks(
            @Param("category") String category,
            @Param("availability") String availability,
            @Param("sort") String sort,
            Pageable pageable);

    @Query("SELECT DISTINCT c.name FROM Book b JOIN b.categories c WHERE b.status = 'ACTIVE' ORDER BY c.name")
    List<String> findAllActiveCategoryNames();

    /** Row lock so concurrent borrows cannot oversell the last copy. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from Book b where b.id = :id")
    Optional<Book> findByIdForUpdate(@Param("id") UUID id);
}
