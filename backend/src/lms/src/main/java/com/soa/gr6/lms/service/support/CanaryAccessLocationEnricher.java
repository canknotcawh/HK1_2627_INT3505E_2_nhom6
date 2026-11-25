package com.soa.gr6.lms.service.support;

import com.soa.gr6.lms.config.CanaryAsyncConfig;
import com.soa.gr6.lms.repository.CanaryAccessRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Bổ sung vị trí cho một lượt truy cập đã được ghi.
 *
 * <p>Đường bình thường chạy sau khi transaction stream PDF đã commit, trên executor riêng:
 * lượt đọc đầu tiên của một IP mới không phải chờ gọi dịch vụ geolocation.</p>
 *
 * <p>Đường dự phòng ({@link #resolveNow}) chạy đồng bộ trong transaction riêng khi admin đọc
 * lịch sử truy cập và gặp dòng còn kẹt ở {@code PENDING} — ví dụ app khởi động lại hoặc hàng
 * đợi đầy làm task nền không chạy.</p>
 */
@Service
public class CanaryAccessLocationEnricher {

    private static final Logger log = LoggerFactory.getLogger(CanaryAccessLocationEnricher.class);

    private final CanaryAccessRepository accessRepository;
    private final IpGeolocationService geolocationService;

    public CanaryAccessLocationEnricher(CanaryAccessRepository accessRepository,
                                        IpGeolocationService geolocationService) {
        this.accessRepository = accessRepository;
        this.geolocationService = geolocationService;
    }

    /** Chạy nền sau commit; không bao giờ ném lỗi ra luồng gọi. */
    @Async(CanaryAsyncConfig.LOCATION_EXECUTOR)
    @Transactional
    public void enrich(Long accessId, String ipAddress) {
        applyResolvedLocation(accessId, ipAddress);
    }

    /** Chữa dòng kẹt PENDING ngay khi đọc; REQUIRES_NEW vì luồng đọc đang ở transaction read-only. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public IpLocation resolveNow(Long accessId, String ipAddress) {
        return applyResolvedLocation(accessId, ipAddress);
    }

    private IpLocation applyResolvedLocation(Long accessId, String ipAddress) {
        if (accessId == null || ipAddress == null || ipAddress.isBlank()) {
            return null;
        }
        try {
            IpLocation location = geolocationService.resolve(ipAddress);
            accessRepository.findById(accessId).ifPresent(access -> {
                access.applyLocation(location);
                accessRepository.save(access);
            });
            return location;
        } catch (RuntimeException e) {
            // IP vẫn được giữ; chỉ thiếu vị trí của riêng lượt truy cập này.
            log.warn("Không cập nhật được vị trí cho lượt truy cập {}: {}", accessId, e.getMessage());
            return null;
        }
    }
}
