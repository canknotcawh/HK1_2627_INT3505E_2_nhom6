package com.soa.gr6.lms.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Lưu file trên đĩa cục bộ (dev/test). Key là đường dẫn tương đối dưới {@code app.storage.root}
 * và bị chặn thoát khỏi thư mục gốc.
 */
@Service
public class LocalStorageService implements StorageService {

    private final Path root;

    public LocalStorageService(@Value("${app.storage.root:./data/books}") String root) {
        this.root = Path.of(root).toAbsolutePath().normalize();
    }

    @Override
    public void store(String key, byte[] content) {
        Path target = resolve(key);
        try {
            Files.createDirectories(target.getParent());
            Files.write(target, content);
        } catch (IOException e) {
            throw new StorageException("cannot write stored file", e);
        }
    }

    @Override
    public InputStream open(String key) {
        Path file = resolve(key);
        if (!Files.isRegularFile(file)) {
            throw new StorageException("stored file is missing");
        }
        try {
            return Files.newInputStream(file);
        } catch (IOException e) {
            throw new StorageException("cannot read stored file", e);
        }
    }

    private Path resolve(String key) {
        if (key == null || key.isBlank()) {
            throw new StorageException("storage key is required");
        }
        Path resolved = root.resolve(key).normalize();
        if (!resolved.startsWith(root)) {
            throw new StorageException("storage key escapes the storage root");
        }
        return resolved;
    }
}
