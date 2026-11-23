package com.soa.gr6.lms.service;

import com.soa.gr6.lms.domain.enums.BookFileKind;
import com.soa.gr6.lms.dto.BookFileResponse;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.List;
import java.util.UUID;

public interface BookFileService {

    BookFileResponse upload(UUID bookId, BookFileKind kind, MultipartFile file, UUID adminId);

    List<BookFileResponse> list(UUID bookId);

    /** Lưu trữ (archive) file: không xoá vật lý để token cũ còn tham chiếu. */
    void archive(UUID bookId, UUID fileId);

    StoredBookFile download(UUID bookId, UUID fileId);

    record StoredBookFile(String fileName, String contentType, long sizeBytes, InputStream stream) {
    }
}
