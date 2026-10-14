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

    /**
     * Full-Text Search with prefix matching, Vietnamese unaccent, and pg_trgm fuzzy matching / typo tolerance.
     */
    @Query(value = """
        SELECT b.* FROM book b
        JOIN (
            SELECT b2.id, MAX(
                COALESCE(ts_rank(to_tsvector('simple', immutable_unaccent(b2.title)), vi_to_prefix_tsquery(:q)), 0) * 4.0
                + COALESCE(ts_rank(to_tsvector('simple', immutable_unaccent(coalesce(b2.subtitle, '') || ' ' || coalesce(b2.description, ''))), vi_to_prefix_tsquery(:q)), 0) * 1.0
                + COALESCE(ts_rank(to_tsvector('simple', immutable_unaccent(coalesce(a2.name, ''))), vi_to_prefix_tsquery(:q)), 0) * 2.5
                + word_similarity(immutable_unaccent(:q), immutable_unaccent(b2.title)) * 3.0
                + COALESCE(word_similarity(immutable_unaccent(:q), immutable_unaccent(a2.name)), 0) * 2.0
            ) AS score
            FROM book b2
            LEFT JOIN book_author ba2 ON b2.id = ba2.book_id
            LEFT JOIN author a2 ON ba2.author_id = a2.id
            LEFT JOIN book_category bc2 ON b2.id = bc2.book_id
            LEFT JOIN category c2 ON bc2.category_id = c2.id
            WHERE b2.status = 'ACTIVE'
              AND (:category IS NULL OR :category = '' OR c2.name = :category)
              AND (
                  :availability IS NULL OR :availability = '' OR :availability = 'all'
                  OR (:availability = 'available' AND b2.available_copies > 0)
                  OR (:availability = 'unavailable' AND b2.available_copies <= 0)
              )
              AND (
                  (vi_to_prefix_tsquery(:q) IS NOT NULL AND (
                      to_tsvector('simple', immutable_unaccent(b2.title || ' ' || coalesce(b2.subtitle, '') || ' ' || coalesce(b2.description, ''))) @@ vi_to_prefix_tsquery(:q)
                      OR (a2.name IS NOT NULL AND to_tsvector('simple', immutable_unaccent(a2.name)) @@ vi_to_prefix_tsquery(:q))
                  ))
                  OR (length(trim(:q)) >= 3 AND (
                      word_similarity(immutable_unaccent(:q), immutable_unaccent(b2.title)) > 0.35
                      OR (a2.name IS NOT NULL AND word_similarity(immutable_unaccent(:q), immutable_unaccent(a2.name)) > 0.35)
                  ))
              )
            GROUP BY b2.id
        ) ranked ON b.id = ranked.id
        ORDER BY ranked.score DESC, b.title ASC
        """,
        countQuery = """
        SELECT COUNT(DISTINCT b2.id)
        FROM book b2
        LEFT JOIN book_author ba2 ON b2.id = ba2.book_id
        LEFT JOIN author a2 ON ba2.author_id = a2.id
        LEFT JOIN book_category bc2 ON b2.id = bc2.book_id
        LEFT JOIN category c2 ON bc2.category_id = c2.id
        WHERE b2.status = 'ACTIVE'
          AND (:category IS NULL OR :category = '' OR c2.name = :category)
          AND (
              :availability IS NULL OR :availability = '' OR :availability = 'all'
              OR (:availability = 'available' AND b2.available_copies > 0)
              OR (:availability = 'unavailable' AND b2.available_copies <= 0)
          )
          AND (
              (vi_to_prefix_tsquery(:q) IS NOT NULL AND (
                  to_tsvector('simple', immutable_unaccent(b2.title || ' ' || coalesce(b2.subtitle, '') || ' ' || coalesce(b2.description, ''))) @@ vi_to_prefix_tsquery(:q)
                  OR (a2.name IS NOT NULL AND to_tsvector('simple', immutable_unaccent(a2.name)) @@ vi_to_prefix_tsquery(:q))
              ))
              OR (length(trim(:q)) >= 3 AND (
                  word_similarity(immutable_unaccent(:q), immutable_unaccent(b2.title)) > 0.35
                  OR (a2.name IS NOT NULL AND word_similarity(immutable_unaccent(:q), immutable_unaccent(a2.name)) > 0.35)
              ))
          )
        """,
        nativeQuery = true)
    Page<Book> searchBooks(
            @Param("q") String q,
            @Param("category") String category,
            @Param("availability") String availability,
            Pageable pageable);

    @Query(value = """
        SELECT DISTINCT b.*
        FROM book b
        LEFT JOIN book_category bc ON b.id = bc.book_id
        LEFT JOIN category c ON bc.category_id = c.id
        WHERE b.status = 'ACTIVE'
          AND (:category IS NULL OR :category = '' OR c.name = :category)
          AND (
              :availability IS NULL OR :availability = '' OR :availability = 'all'
              OR (:availability = 'available' AND b.available_copies > 0)
              OR (:availability = 'unavailable' AND b.available_copies <= 0)
          )
        ORDER BY b.title ASC
        """,
        countQuery = """
        SELECT COUNT(DISTINCT b.id)
        FROM book b
        LEFT JOIN book_category bc ON b.id = bc.book_id
        LEFT JOIN category c ON bc.category_id = c.id
        WHERE b.status = 'ACTIVE'
          AND (:category IS NULL OR :category = '' OR c.name = :category)
          AND (
              :availability IS NULL OR :availability = '' OR :availability = 'all'
              OR (:availability = 'available' AND b.available_copies > 0)
              OR (:availability = 'unavailable' AND b.available_copies <= 0)
          )
        """,
        nativeQuery = true)
    Page<Book> filterBooks(
            @Param("category") String category,
            @Param("availability") String availability,
            Pageable pageable);

    @Query("SELECT DISTINCT c.name FROM Book b JOIN b.categories c WHERE b.status = 'ACTIVE' ORDER BY c.name")
    List<String> findAllActiveCategoryNames();

    /** Row lock so concurrent borrows cannot oversell the last copy. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from Book b where b.id = :id")
    Optional<Book> findByIdForUpdate(@Param("id") UUID id);
}
