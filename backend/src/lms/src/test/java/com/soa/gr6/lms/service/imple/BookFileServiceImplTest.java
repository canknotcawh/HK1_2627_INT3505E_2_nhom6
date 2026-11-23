package com.soa.gr6.lms.service.imple;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.util.unit.DataSize;

import com.soa.gr6.lms.domain.Book;
import com.soa.gr6.lms.domain.BookFile;
import com.soa.gr6.lms.domain.enums.BookFileKind;
import com.soa.gr6.lms.domain.enums.BookFileStatus;
import com.soa.gr6.lms.exception.ApiException;
import com.soa.gr6.lms.exception.BookNotFoundException;
import com.soa.gr6.lms.exception.ErrorCode;
import com.soa.gr6.lms.repository.BookFileRepository;
import com.soa.gr6.lms.repository.BookRepository;
import com.soa.gr6.lms.storage.StorageService;

class BookFileServiceImplTest {

    private final BookRepository bookRepository = mock(BookRepository.class);
    private final BookFileRepository bookFileRepository = mock(BookFileRepository.class);
    private final StorageService storageService = mock(StorageService.class);
    private final BookFileServiceImpl service = new BookFileServiceImpl(
            bookRepository, bookFileRepository, storageService, DataSize.ofMegabytes(1));

    private final UUID bookId = UUID.randomUUID();

    private static byte[] pdf(int pages) throws IOException {
        try (PDDocument document = new PDDocument()) {
            for (int i = 0; i < pages; i++) {
                document.addPage(new PDPage());
            }
            var out = new java.io.ByteArrayOutputStream();
            document.save(out);
            return out.toByteArray();
        }
    }

    private static MockMultipartFile pdfFile(byte[] content) {
        return new MockMultipartFile("file", "clean-code.pdf", "application/pdf", content);
    }

    private void givenBook() {
        Book book = new Book(bookId, "Clean Code");
        when(bookRepository.findById(bookId)).thenReturn(Optional.of(book));
    }

    @Test
    void uploadStoresPdfAndReturnsMetadataWithoutStorageKey() throws Exception {
        givenBook();
        when(bookFileRepository.findByBookIdAndKindAndStatus(bookId, BookFileKind.FULL, BookFileStatus.ACTIVE))
                .thenReturn(Optional.empty());
        when(bookFileRepository.save(any(BookFile.class))).thenAnswer(call -> call.getArgument(0));

        var response = service.upload(bookId, BookFileKind.FULL, pdfFile(pdf(3)), UUID.randomUUID());

        assertThat(response.kind()).isEqualTo(BookFileKind.FULL);
        assertThat(response.pageCount()).isEqualTo(3);
        assertThat(response.status()).isEqualTo("ACTIVE");
        assertThat(response.originalName()).isEqualTo("clean-code.pdf");
        assertThat(response.sha256()).hasSize(64);
        assertThat(response.sizeBytes()).isPositive();

        ArgumentCaptor<String> key = ArgumentCaptor.forClass(String.class);
        verify(storageService).store(key.capture(), any(byte[].class));
        assertThat(key.getValue()).isEqualTo("books/" + bookId + "/" + response.id() + ".pdf");

        ArgumentCaptor<BookFile> saved = ArgumentCaptor.forClass(BookFile.class);
        verify(bookFileRepository).save(saved.capture());
        assertThat(saved.getValue().getStorageKey()).isEqualTo(key.getValue());
    }

    @Test
    void uploadArchivesPreviousActiveFileOfSameKind() throws Exception {
        givenBook();
        var previous = new BookFile(UUID.randomUUID(), new Book(bookId, "Clean Code"), BookFileKind.FULL,
                "books/x/old.pdf", "old.pdf", "application/pdf", 10, "a".repeat(64), 1, null);
        when(bookFileRepository.findByBookIdAndKindAndStatus(bookId, BookFileKind.FULL, BookFileStatus.ACTIVE))
                .thenReturn(Optional.of(previous));
        when(bookFileRepository.save(any(BookFile.class))).thenAnswer(call -> call.getArgument(0));

        service.upload(bookId, BookFileKind.FULL, pdfFile(pdf(1)), null);

        assertThat(previous.getStatus()).isEqualTo(BookFileStatus.ARCHIVED);
        assertThat(previous.getArchivedAt()).isNotNull();
    }

    @Test
    void uploadRejectsNonPdfContentTypeWithoutTouchingStorage() {
        givenBook();
        var docx = new MockMultipartFile("file", "book.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document", new byte[]{1, 2, 3});

        assertThatThrownBy(() -> service.upload(bookId, BookFileKind.FULL, docx, null))
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getErrorCode())
                .isEqualTo(ErrorCode.BOOK_FILE_TYPE_UNSUPPORTED);
        verify(storageService, never()).store(anyString(), any());
    }

    @Test
    void uploadRejectsBytesThatAreNotAPdf() {
        givenBook();

        assertThatThrownBy(() -> service.upload(bookId, BookFileKind.FULL,
                pdfFile("not a pdf".getBytes()), null))
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getErrorCode())
                .isEqualTo(ErrorCode.BOOK_FILE_INVALID);
    }

    @Test
    void uploadRejectsOversizedFile() {
        givenBook();
        var big = new MockMultipartFile("file", "big.pdf", "application/pdf", new byte[(int) DataSize.ofMegabytes(2).toBytes()]);

        assertThatThrownBy(() -> service.upload(bookId, BookFileKind.FULL, big, null))
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getErrorCode())
                .isEqualTo(ErrorCode.BOOK_FILE_TOO_LARGE);
        verify(storageService, never()).store(anyString(), any());
    }

    @Test
    void uploadRejectsUnknownBook() {
        when(bookRepository.findById(bookId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.upload(bookId, BookFileKind.FULL, pdfFile(new byte[]{1}), null))
                .isInstanceOf(BookNotFoundException.class);
    }

    @Test
    void listReturnsFilesOfBook() {
        when(bookRepository.existsById(bookId)).thenReturn(true);
        Book book = new Book(bookId, "Clean Code");
        when(bookFileRepository.findByBookIdOrderByCreatedAtDesc(bookId)).thenReturn(List.of(
                new BookFile(UUID.randomUUID(), book, BookFileKind.FULL, "books/x/a.pdf", "a.pdf",
                        "application/pdf", 10, "a".repeat(64), 1, null)));

        assertThat(service.list(bookId)).hasSize(1);
    }

    @Test
    void listRejectsUnknownBook() {
        when(bookRepository.existsById(bookId)).thenReturn(false);

        assertThatThrownBy(() -> service.list(bookId)).isInstanceOf(BookNotFoundException.class);
    }

    @Test
    void archiveMarksFileAndMissingFileIsNotFound() {
        var file = new BookFile(UUID.randomUUID(), new Book(bookId, "Clean Code"), BookFileKind.PREVIEW,
                "books/x/p.pdf", "p.pdf", "application/pdf", 10, "a".repeat(64), 1, null);
        when(bookFileRepository.findByIdAndBookId(file.getId(), bookId)).thenReturn(Optional.of(file));

        service.archive(bookId, file.getId());
        assertThat(file.getStatus()).isEqualTo(BookFileStatus.ARCHIVED);

        UUID missing = UUID.randomUUID();
        when(bookFileRepository.findByIdAndBookId(missing, bookId)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.archive(bookId, missing))
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getErrorCode())
                .isEqualTo(ErrorCode.BOOK_FILE_NOT_FOUND);
    }

    @Test
    void downloadRefusesArchivedFile() {
        var file = new BookFile(UUID.randomUUID(), new Book(bookId, "Clean Code"), BookFileKind.FULL,
                "books/x/f.pdf", "f.pdf", "application/pdf", 10, "a".repeat(64), 1, null);
        file.archive();
        when(bookFileRepository.findByIdAndBookId(file.getId(), bookId)).thenReturn(Optional.of(file));

        assertThatThrownBy(() -> service.download(bookId, file.getId()))
                .isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getErrorCode())
                .isEqualTo(ErrorCode.BOOK_FILE_NOT_FOUND);
    }

    @Test
    void downloadStreamsActiveFile() {
        givenBook();
        var file = new BookFile(UUID.randomUUID(), new Book(bookId, "Clean Code"), BookFileKind.FULL,
                "books/x/f.pdf", "f.pdf", "application/pdf", 10, "a".repeat(64), 1, null);
        when(bookFileRepository.findByIdAndBookId(eq(file.getId()), eq(bookId))).thenReturn(Optional.of(file));
        when(storageService.open("books/x/f.pdf")).thenReturn(java.io.InputStream.nullInputStream());

        var stored = service.download(bookId, file.getId());

        assertThat(stored.fileName()).isEqualTo("f.pdf");
        assertThat(stored.contentType()).isEqualTo("application/pdf");
    }
}
