package com.soa.gr6.lms.service.support;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.Locale;

/**
 * Lấy IP thật của thiết bị đã mở link canary.
 *
 * <p>Chỉ tin {@code X-Forwarded-For}/{@code X-Real-IP} khi peer trực tiếp là proxy nội bộ
 * (loopback hoặc private). Nếu backend lộ trực tiếp ra Internet, client có thể tự đặt header
 * để làm sai lệch vị trí, nên khi đó dùng luôn địa chỉ của kết nối.</p>
 */
@Component
public class ClientIpResolver {

    private final boolean trustForwardedHeaders;

    public ClientIpResolver(@Value("${app.canary.trust-forwarded-headers:true}") boolean trustForwardedHeaders) {
        this.trustForwardedHeaders = trustForwardedHeaders;
    }

    /** Trả IP đã chuẩn hoá (IPv4-mapped IPv6 được đưa về IPv4), có thể null. */
    public String resolve(HttpServletRequest request) {
        if (request == null) {
            return null;
        }
        String peer = normalize(request.getRemoteAddr());
        if (!trustForwardedHeaders || !isInternal(peer)) {
            return peer;
        }
        String forwarded = forwardedClient(request.getHeader("X-Forwarded-For"));
        if (forwarded != null) {
            return forwarded;
        }
        String realIp = literalIp(request.getHeader("X-Real-IP"));
        if (realIp != null) {
            return realIp;
        }
        return peer;
    }

    /**
     * Đọc {@code X-Forwarded-For} từ phải sang trái và lấy địa chỉ công cộng đầu tiên.
     *
     * <p>Header này do client tự gửi, còn mỗi proxy chỉ nối thêm địa chỉ peer của nó vào cuối.
     * Vì vậy phần bên trái có thể là giá trị giả mạo; địa chỉ đúng là hop gần ta nhất mà không
     * phải proxy nội bộ — tức client thật.</p>
     */
    private static String forwardedClient(String header) {
        if (header == null || header.isBlank()) {
            return null;
        }
        String[] parts = header.split(",");
        for (int i = parts.length - 1; i >= 0; i--) {
            String candidate = literalIp(parts[i]);
            if (candidate != null && !isInternal(candidate)) {
                return candidate;
            }
        }
        return null;
    }

    private static String literalIp(String raw) {
        if (raw == null) {
            return null;
        }
        String value = raw.trim();
        return looksLikeIp(value) ? normalize(value) : null;
    }

    /** Chuẩn hoá "::ffff:1.2.3.4" → "1.2.3.4", "[::1]" và "0:0:0:0:0:0:0:1" → "::1". */
    public static String normalize(String ip) {
        if (ip == null) {
            return null;
        }
        String value = ip.trim();
        if (value.isEmpty()) {
            return null;
        }
        if (value.startsWith("[") && value.endsWith("]") && value.length() > 2) {
            value = value.substring(1, value.length() - 1);
        }
        String lower = value.toLowerCase(Locale.ROOT);
        if (lower.startsWith("::ffff:") && lower.indexOf('.') > 0) {
            return value.substring(value.lastIndexOf(':') + 1);
        }
        if ("0:0:0:0:0:0:0:1".equals(lower)) {
            return "::1";
        }
        if ("0:0:0:0:0:0:0:0".equals(lower)) {
            return "::";
        }
        return value;
    }

    /** Có phải IP nội bộ/không định tuyến ra Internet công cộng? */
    public static boolean isInternal(String ip) {
        if (ip == null || !looksLikeIp(ip)) {
            return true;
        }
        try {
            InetAddress address = InetAddress.getByName(ip);
            return address.isAnyLocalAddress()
                    || address.isLoopbackAddress()
                    || address.isLinkLocalAddress()
                    || address.isSiteLocalAddress()
                    || address.isMulticastAddress();
        } catch (UnknownHostException e) {
            return true;
        }
    }

    private static boolean looksLikeIp(String value) {
        if (value == null || value.isBlank() || value.length() > 45) {
            return false;
        }
        return (value.contains(".") || value.contains(":")) && value.matches("[0-9a-fA-F:.]+");
    }
}
