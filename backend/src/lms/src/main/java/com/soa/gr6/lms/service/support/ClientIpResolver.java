package com.soa.gr6.lms.service.support;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.InetAddress;
import java.net.UnknownHostException;

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
        String forwarded = firstAddress(request.getHeader("X-Forwarded-For"));
        if (forwarded != null) {
            return forwarded;
        }
        String realIp = firstAddress(request.getHeader("X-Real-IP"));
        if (realIp != null) {
            return realIp;
        }
        return peer;
    }

    private static String firstAddress(String header) {
        if (header == null || header.isBlank()) {
            return null;
        }
        String first = header.split(",")[0].trim();
        return looksLikeIp(first) ? normalize(first) : null;
    }

    /** Chuẩn hoá "::ffff:1.2.3.4" → "1.2.3.4"; giá trị lạ được trả nguyên văn (đã trim). */
    public static String normalize(String ip) {
        if (ip == null) {
            return null;
        }
        String value = ip.trim();
        if (value.isEmpty()) {
            return null;
        }
        String lower = value.toLowerCase();
        if (lower.startsWith("::ffff:") && lower.indexOf('.') > 0) {
            return value.substring(value.lastIndexOf(':') + 1);
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
