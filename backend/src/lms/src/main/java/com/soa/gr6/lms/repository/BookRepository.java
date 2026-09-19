package com.soa.gr6.lms.repository;

import com.soa.gr6.lms.domain.Book;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface BookRepository extends JpaRepository<Book, UUID> {
}
