package com.soa.gr6.lms.repository;

import com.soa.gr6.lms.domain.BookFile;
import com.soa.gr6.lms.domain.enums.BookFileKind;
import com.soa.gr6.lms.domain.enums.BookFileStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BookFileRepository extends JpaRepository<BookFile, UUID> {

    List<BookFile> findByBookIdOrderByCreatedAtDesc(UUID bookId);

    Optional<BookFile> findByBookIdAndKindAndStatus(UUID bookId, BookFileKind kind, BookFileStatus status);

    Optional<BookFile> findByIdAndBookId(UUID id, UUID bookId);

    List<BookFile> findByBookIdInAndStatus(Collection<UUID> bookIds, BookFileStatus status);
}
