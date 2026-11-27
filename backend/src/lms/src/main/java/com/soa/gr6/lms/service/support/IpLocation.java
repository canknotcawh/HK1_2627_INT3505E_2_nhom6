package com.soa.gr6.lms.service.support;

/** Vị trí ước lượng của một địa chỉ IP tại thời điểm truy cập. */
public record IpLocation(
        String ipAddress,
        String ipVersion,
        String countryCode,
        String country,
        String region,
        String city,
        Double latitude,
        Double longitude,
        String timezone,
        String isp,
        String source) {

    /** Đã ghi IP nhưng vị trí còn chờ phân giải ở luồng nền. */
    public static final String SOURCE_PENDING = "PENDING";
    public static final String SOURCE_GEOIP = "GEOIP";
    public static final String SOURCE_LOCAL = "LOCAL";
    public static final String SOURCE_UNKNOWN = "UNKNOWN";

    /** IP nội bộ/loopback: không gọi dịch vụ ngoài, cũng không có toạ độ công cộng. */
    public static IpLocation local(String ipAddress) {
        return new IpLocation(ipAddress, versionOf(ipAddress), null, null, null, null,
                null, null, null, null, SOURCE_LOCAL);
    }

    public static IpLocation unknown(String ipAddress) {
        return new IpLocation(ipAddress, versionOf(ipAddress), null, null, null, null,
                null, null, null, null, SOURCE_UNKNOWN);
    }

    public static String versionOf(String ipAddress) {
        if (ipAddress == null || ipAddress.isBlank()) {
            return null;
        }
        return ipAddress.contains(":") ? "IPv6" : "IPv4";
    }
}
