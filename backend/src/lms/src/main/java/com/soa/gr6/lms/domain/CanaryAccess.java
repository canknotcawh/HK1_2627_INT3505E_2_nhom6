package com.soa.gr6.lms.domain;

import com.soa.gr6.lms.domain.enums.CanaryOutcome;
import com.soa.gr6.lms.service.support.IpLocation;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * Một lượt truy cập endpoint stream. Lưu IP thô + vị trí ước lượng để truy vết thiết bị,
 * song song với hash IP/UA (pepper) để vẫn đối chiếu được khi không cần IP thô.
 */
@Entity
@Table(name = "canary_access")
@Getter
@NoArgsConstructor
public class CanaryAccess {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @Column(name = "token_id")
    private UUID tokenId;

    @Column(name = "accessed_at", nullable = false)
    private Instant accessedAt;

    @Column(name = "ip_hash", length = 64)
    private String ipHash;

    @Column(name = "ua_hash", length = 64)
    private String uaHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "outcome", length = 20, nullable = false)
    private CanaryOutcome outcome;

    @Column(name = "bytes_sent")
    private Long bytesSent;

    @Column(name = "range_header", length = 50)
    private String rangeHeader;

    @Column(name = "request_id", length = 64)
    private String requestId;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "ip_version", length = 10)
    private String ipVersion;

    @Column(name = "country_code", length = 2)
    private String countryCode;

    @Column(name = "country_name", length = 100)
    private String countryName;

    @Column(name = "region_name", length = 120)
    private String regionName;

    @Column(name = "city_name", length = 120)
    private String cityName;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "time_zone", length = 64)
    private String timeZone;

    @Column(name = "isp", length = 150)
    private String isp;

    @Column(name = "location_source", length = 20)
    private String locationSource;

    /**
     * Ghi lượt truy cập với IP thô ngay lập tức; vị trí được bổ sung sau khi commit
     * qua {@link #applyLocation(IpLocation)} để không giữ transaction stream PDF.
     */
    public CanaryAccess(UUID tokenId, Instant accessedAt, String ipHash, String uaHash, CanaryOutcome outcome,
                        Long bytesSent, String rangeHeader, String requestId, String ipAddress) {
        this.tokenId = tokenId;
        this.accessedAt = accessedAt;
        this.ipHash = ipHash;
        this.uaHash = uaHash;
        this.outcome = outcome;
        this.bytesSent = bytesSent;
        this.rangeHeader = rangeHeader;
        this.requestId = requestId;
        if (ipAddress != null && !ipAddress.isBlank()) {
            this.ipAddress = ipAddress;
            this.ipVersion = IpLocation.versionOf(ipAddress);
            this.locationSource = IpLocation.SOURCE_PENDING;
        }
    }

    /** Áp kết quả phân giải vị trí (chạy ở luồng nền, transaction riêng). */
    public void applyLocation(IpLocation location) {
        if (location == null) {
            return;
        }
        this.countryCode = location.countryCode();
        this.countryName = location.country();
        this.regionName = location.region();
        this.cityName = location.city();
        this.latitude = location.latitude();
        this.longitude = location.longitude();
        this.timeZone = location.timezone();
        this.isp = location.isp();
        this.locationSource = location.source();
    }
}
