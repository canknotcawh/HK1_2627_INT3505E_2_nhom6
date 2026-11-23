package com.soa.gr6.lms.service.imple;

import com.soa.gr6.lms.domain.Book;
import com.soa.gr6.lms.domain.BookFile;
import com.soa.gr6.lms.domain.enums.BookFileKind;
import com.soa.gr6.lms.domain.enums.BookFileStatus;
import com.soa.gr6.lms.dto.BookFileResponse;
import com.soa.gr6.lms.exception.ApiException;
import com.soa.gr6.lms.exception.BookNotFoundException;
import com.soa.gr6.lms.exception.ErrorCode;
import com.soa.gr6.lms.repository.BookFileRepository;
import com.soa.gr6.lms.repository.BookRepository;
import com.soa.gr6.lms.service.BookFileService;
import com.soa.gr6.lms.storage.StorageException;
import com.soa.gr6.lms.storage.StorageService;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.unit.DataSize;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

@Service
public class BookFileServiceImpl implements BookFileService {

    static final String PDF_CONTENT_TYPE = "application/pdf";

    private final BookRepository bookRepository;
    private final BookFileRepository bookFileRepository;
    private final StorageService storageService;
    private final DataSize maxFileSize;

    public BookFileServiceImpl(BookRepository bookRepository,
                               BookFileRepository bookFileRepository,
                               StorageService storageService,
                               @Value("${app.storage.max-file-size:50MB}") DataSize maxFileSize) {
        this.bookRepository = bookRepository;
        this.bookFileRepository = bookFileRepository;
        this.storageService = storageService;
        this.maxFileSize = maxFileSize;
    }

    @Override
    @Transactional
    public BookFileResponse upload(UUID bookId, BookFileKind kind, MultipartFile file, UUID adminId) {
        Book book = bookRepository.findById(bookId).orElseThrow(() -> new BookNotFoundException(bookId));
        if (kind == null) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
        if (file == null || file.isEmpty()) {
            throw new ApiException(ErrorCode.BOOK_FILE_INVALID);
        }
        if (!PDF_CONTENT_TYPE.equalsIgnoreCase(file.getContentType())) {
            throw new ApiException(ErrorCode.BOOK_FILE_TYPE_UNSUPPORTED);
        }
        if (file.getSize() > maxFileSize.toBytes()) {
            throw new ApiException(ErrorCode.BOOK_FILE_TOO_LARGE);
        }
        byte[] content;
        try {
            content = file.getBytes();
        } catch (IOException e) {
            throw new ApiException(ErrorCode.BOOK_FILE_INVALID);
        }
        int pageCount = readPageCount(content);

        UUID fileId = UUID.randomUUID();
        String storageKey = "books/" + book.getId() + "/" + fileId + ".pdf";
        bookFileRepository.findByBookIdAndKindAndStatus(bookId, kind, BookFileStatus.ACTIVE)
                .ifPresent(BookFile::archive);

        storageService.store(storageKey, content);
        BookFile saved = bookFileRepository.save(new BookFile(
                fileId, book, kind, storageKey, sanitizeName(file.getOriginalFilename()),
                PDF_CONTENT_TYPE, content.length, sha256(content), pageCount, adminId));
        return BookFileResponse.from(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BookFileResponse> list(UUID bookId) {
        requireBook(bookId);
        return bookFileRepository.findByBookIdOrderByCreatedAtDesc(bookId).stream()
                .map(BookFileResponse::from)
                .toList();
    }

    @Override
    @Transactional
    public void archive(UUID bookId, UUID fileId) {
        BookFile file = bookFileRepository.findByIdAndBookId(fileId, bookId)
                .orElseThrow(() -> new ApiException(ErrorCode.BOOK_FILE_NOT_FOUND));
        file.archive();
    }

    @Override
    @Transactional(readOnly = true)
    public StoredBookFile download(UUID bookId, UUID fileId) {
        BookFile file = bookFileRepository.findByIdAndBookId(fileId, bookId)
                .filter(BookFile::isActive)
                .orElseThrow(() -> new ApiException(ErrorCode.BOOK_FILE_NOT_FOUND));
        try {
            return new StoredBookFile(file.getOriginalName(), file.getContentType(), file.getSizeBytes(),
                    storageService.open(file.getStorageKey()));
        } catch (StorageException e) {
            throw new ApiException(ErrorCode.BOOK_FILE_NOT_FOUND);
        }
    }

    private void requireBook(UUID bookId) {
        if (!bookRepository.existsById(bookId)) {
            throw new BookNotFoundException(bookId);
        }
    }

    /** PDFBox parse file: vừa xác nhận là PDF hợp lệ, vừa lấy số trang. */
    private static int readPageCount(byte[] content) {
        try (PDDocument document = Loader.loadPDF(content)) {
            if (document.getNumberOfPages() == 0) {
                throw new ApiException(ErrorCode.BOOK_FILE_INVALID);
            }
            return document.getNumberOfPages();
        } catch (IOException e) {
            throw new ApiException(ErrorCode.BOOK_FILE_INVALID);
        }
    }

    private static String sha256(byte[] content) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static String sanitizeName(String originalName) {
        if (originalName == null || originalName.isBlank()) {
            return "document.pdf";
        }
        String name = originalName.replace('\\', '/');
        name = name.substring(name.lastIndexOf('/') + 1).trim();
        if (name.isEmpty()) {
            return "document.pdf";
        }
        return name.length() > 255 ? name.substring(0, 255) : name;
    }
}
