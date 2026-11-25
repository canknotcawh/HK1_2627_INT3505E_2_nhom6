package com.soa.gr6.lms.dto;

import com.soa.gr6.lms.domain.CanaryAccess;
import com.soa.gr6.lms.service.support.IpLocation;

/** IP và vị trí ước lượng của thiết bị đã dùng canary token. */
public record ClientLocationResponse(
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

    public static ClientLocationResponse from(IpLocation location) {
        if (location == null) {
            return null;
        }
        return new ClientLocationResponse(
                location.ipAddress(),
                location.ipVersion(),
                location.countryCode(),
                location.country(),
                location.region(),
                location.city(),
                location.latitude(),
                location.longitude(),
                location.timezone(),
                location.isp(),
                location.source());
    }

    /** Vị trí đã lưu tại đúng thời điểm truy cập, không phân giải lại. */
    public static ClientLocationResponse from(CanaryAccess access) {
        if (access == null || access.getIpAddress() == null) {
            return null;
        }
        return new ClientLocationResponse(
                access.getIpAddress(),
                access.getIpVersion(),
                access.getCountryCode(),
                access.getCountryName(),
                access.getRegionName(),
                access.getCityName(),
                access.getLatitude(),
                access.getLongitude(),
                access.getTimeZone(),
                access.getIsp(),
                access.getLocationSource());
    }
}
