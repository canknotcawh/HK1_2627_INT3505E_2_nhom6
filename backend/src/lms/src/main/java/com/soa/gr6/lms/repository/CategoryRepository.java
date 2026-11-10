package com.soa.gr6.lms.repository;

import com.soa.gr6.lms.domain.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CategoryRepository extends JpaRepository<Category, UUID> {
    Optional<Category> findByNameIgnoreCase(String name);

    List<Category> findByNameIn(Collection<String> names);

    interface CategoryCount {
        UUID getId();

        String getName();

        long getBookCount();
    }

    @Query(value = """
            SELECT c.id AS id, c.name AS name, COUNT(bc.book_id) AS bookCount
            FROM category c
            LEFT JOIN book_category bc ON bc.category_id = c.id
            GROUP BY c.id, c.name
            ORDER BY c.name
            """, nativeQuery = true)
    List<CategoryCount> findAllWithCounts();

    @Query(value = "SELECT COUNT(*) FROM book_category WHERE category_id = :id", nativeQuery = true)
    long countBooks(@Param("id") UUID id);

    @Modifying
    @Query(value = """
            INSERT INTO book_category (book_id, category_id)
            SELECT book_id, :target FROM book_category WHERE category_id = :source
            ON CONFLICT DO NOTHING
            """, nativeQuery = true)
    void copyBooks(@Param("source") UUID source, @Param("target") UUID target);
}
