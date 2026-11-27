package com.soa.gr6.lms.service.support;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Phân giải IP → quốc gia/thành phố/ISP qua một HTTP API cấu hình được
 * (mặc định ip-api.com, miễn phí và không cần API key).
 *
 * <p>Nguyên tắc: không bao giờ làm hỏng luồng đọc PDF. Mọi lỗi mạng/timeout đều trả
 * {@link IpLocation#unknown(String)}; kết quả được cache trong bộ nhớ để không gọi
 * lặp lại cho cùng một IP (một lượt xem PDF tạo ra nhiều range request).</p>
 */
@Service
public class IpGeolocationService {

    
    private static final int MAX_CACHE_ENTRIES = 5_000;
    private static final Duration UNKNOWN_CACHE_TTL = Duration.ofMinutes(5);

    private final RestClient restClient;
    private final boolean enabled;
    private final String endpointTemplate;
    private final Duration cacheTtl;
    private final Map<String, Cached> cache = new ConcurrentHashMap<>();

    public IpGeolocationService(RestClient.Builder restClientBuilder,
                                @Value("${app.canary.geolocation.enabled:true}") boolean enabled,
                                @Value("${app.canary.geolocation.endpoint:http://ip-api.com/json/{ip}?fields=status,message,country,countryCode,regionName,city,lat,lon,timezone,isp}")
                                String endpointTemplate,
                                @Value("${app.canary.geolocation.timeout:800ms}") Duration timeout,
                                @Value("${app.canary.geolocation.cache-ttl:6h}") Duration cacheTtl) {
        int timeoutMillis = (int) Math.max(200, timeout.toMillis());
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(timeoutMillis);
        factory.setReadTimeout(timeoutMillis);
        this.restClient = restClientBuilder.requestFactory(factory).build();
        this.enabled = enabled;
        this.endpointTemplate = endpointTemplate;
        this.cacheTtl = cacheTtl;
    }

    public IpLocation resolve(String rawIp) {
        String ip = ClientIpResolver.normalize(rawIp);
        if (ip == null) {
            return IpLocation.unknown(null);
        }
        if (ClientIpResolver.isInternal(ip)) {
            return IpLocation.local(ip);
        }
        if (!enabled) {
            return IpLocation.unknown(ip);
        }

        Cached cached = cache.get(ip);
        if (cached != null && cached.expiresAt().isAfter(Instant.now())) {
            return cached.location();
        }

        IpLocation resolved = lookup(ip);
        if (cache.size() > MAX_CACHE_ENTRIES) {
            cache.clear();
        }
        Duration ttl = IpLocation.SOURCE_UNKNOWN.equals(resolved.source()) ? UNKNOWN_CACHE_TTL : cacheTtl;
        cache.put(ip, new Cached(resolved, Instant.now().plus(ttl)));
        return resolved;
    }

    private IpLocation lookup(String ip) {
        try {
            IpApiResponse body = restClient.get()
                    .uri(endpointTemplate.replace("{ip}", ip))
                    .retrieve()
                    .body(IpApiResponse.class);
            if (body == null || !"success".equalsIgnoreCase(body.status())) {
                return IpLocation.unknown(ip);
            }
            return new IpLocation(
                    ip,
                    IpLocation.versionOf(ip),
                    body.countryCode() == null ? null : body.countryCode().toUpperCase(Locale.ROOT),
                    body.country(),
                    body.regionName(),
                    body.city(),
                    body.lat(),
                    body.lon(),
                    body.timezone(),
                    body.isp(),
                    IpLocation.SOURCE_GEOIP);
        } catch (RuntimeException e) {
            // Fail open: thiếu vị trí vẫn phải giữ được IP và lượt truy cập.
            // Không log IP hay lỗi chi tiết: log dev/debug không được phép bật cho dữ liệu này.
            return IpLocation.unknown(ip);
        }
    }

    private record Cached(IpLocation location, Instant expiresAt) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record IpApiResponse(String status, String message, String country, String countryCode,
                                 String regionName, String city, Double lat, Double lon,
                                 String timezone, String isp) {
    }
}
