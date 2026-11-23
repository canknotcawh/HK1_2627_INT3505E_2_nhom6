package com.soa.gr6.lms.storage;

import java.io.InputStream;

/**
 * Nơi lưu file gốc (PDF). Key do service sinh và chỉ nằm trong DB; không trả ra client.
 * Production có thể thay bằng S3-compatible bucket mà không đổi code gọi.
 */
public interface StorageService {

    void store(String key, byte[] content);

    /** Mở stream mới cho mỗi lần gọi; caller có trách nhiệm đóng. */
    InputStream open(String key);
}
