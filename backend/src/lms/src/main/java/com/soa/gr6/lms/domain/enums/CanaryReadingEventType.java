package com.soa.gr6.lms.domain.enums;

/** Hành vi của người đọc trên bản PDF canary. */
public enum CanaryReadingEventType {
    /** Mở bản đọc (trình đọc PDF đã tải xong nội dung). */
    OPEN,
    /** Đóng bản đọc. */
    CLOSE,
    /** Tải lại trang / làm mới phiên đọc. */
    RELOAD,
    /** Thao tác đáng ngờ: chuột phải, Ctrl+S/P, chụp màn hình, copy nội dung. */
    SUSPICIOUS;

    public static CanaryReadingEventType parse(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return valueOf(raw.trim().toUpperCase(java.util.Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
