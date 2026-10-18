package com.soa.gr6.lms.service.support;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

public final class PageableSupport {

    private PageableSupport() {
    }

    /** Caps the page size so a caller cannot request an unbounded page. */
    public static Pageable clamp(Pageable pageable, int maxPageSize) {
        return pageable.getPageSize() > maxPageSize
                ? PageRequest.of(pageable.getPageNumber(), maxPageSize, pageable.getSort())
                : pageable;
    }
}
