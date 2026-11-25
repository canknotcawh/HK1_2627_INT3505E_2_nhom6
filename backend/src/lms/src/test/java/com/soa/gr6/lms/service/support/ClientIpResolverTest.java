package com.soa.gr6.lms.service.support;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

/** IP ghi vào canary phải là thiết bị thật, không phải proxy hay giá trị client tự đặt. */
class ClientIpResolverTest {

    private final ClientIpResolver trusting = new ClientIpResolver(true);
    private final ClientIpResolver notTrusting = new ClientIpResolver(false);

    @Test
    void usesConnectionAddressWhenPeerIsPublicEvenIfHeaderIsForged() {
        var request = request("203.113.131.1");
        request.addHeader("X-Forwarded-For", "1.2.3.4");

        assertThat(trusting.resolve(request)).isEqualTo("203.113.131.1");
    }

    @Test
    void skipsClientSuppliedEntriesAndTakesTheRealClientBehindProxy() {
        var request = request("127.0.0.1");
        // Client gửi "1.2.3.4", nginx nối thêm IP thật của client vào cuối.
        request.addHeader("X-Forwarded-For", "1.2.3.4, 203.113.131.1");

        assertThat(trusting.resolve(request)).isEqualTo("203.113.131.1");
    }

    @Test
    void skipsInternalProxyHopsFromTheRight() {
        var request = request("127.0.0.1");
        request.addHeader("X-Forwarded-For", "9.9.9.9, 203.113.131.1, 10.0.0.5, 172.16.0.9");

        assertThat(trusting.resolve(request)).isEqualTo("203.113.131.1");
    }

    @Test
    void fallsBackToConnectionAddressWhenAllHopsAreInternal() {
        var request = request("10.0.0.5");
        request.addHeader("X-Forwarded-For", "10.0.0.9");

        assertThat(trusting.resolve(request)).isEqualTo("10.0.0.5");
    }

    @Test
    void normalisesIpv6LoopbackAndMappedIpv4() {
        var loopback = request("0:0:0:0:0:0:0:1");
        assertThat(trusting.resolve(loopback)).isEqualTo("::1");

        var mapped = request("0:0:0:0:0:0:0:1");
        mapped.addHeader("X-Forwarded-For", "::ffff:203.113.131.1");
        assertThat(trusting.resolve(mapped)).isEqualTo("203.113.131.1");
    }

    @Test
    void ignoresForwardedHeadersWhenTrustIsDisabled() {
        var request = request("127.0.0.1");
        request.addHeader("X-Forwarded-For", "203.113.131.1");

        assertThat(notTrusting.resolve(request)).isEqualTo("127.0.0.1");
    }

    @Test
    void ignoresGarbageHeaderValues() {
        var request = request("127.0.0.1");
        request.addHeader("X-Forwarded-For", "unknown, <script>");

        assertThat(trusting.resolve(request)).isEqualTo("127.0.0.1");
    }

    @Test
    void usesRealIpHeaderWhenForwardedForIsAbsent() {
        var request = request("127.0.0.1");
        request.addHeader("X-Real-IP", "203.113.131.1");

        assertThat(trusting.resolve(request)).isEqualTo("203.113.131.1");
    }

    private static MockHttpServletRequest request(String remoteAddr) {
        var request = new MockHttpServletRequest();
        request.setRemoteAddr(remoteAddr);
        return request;
    }
}
