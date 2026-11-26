package com.soa.gr6.lms.controller.admin;

import com.soa.gr6.lms.domain.enums.SecurityEventSeverity;
import com.soa.gr6.lms.domain.enums.SecurityEventType;
import com.soa.gr6.lms.dto.SecurityEventResponse;
import com.soa.gr6.lms.service.SecurityEventService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/security-events")
public class AdminSecurityEventController {

    private final SecurityEventService securityEventService;

    public AdminSecurityEventController(SecurityEventService securityEventService) {
        this.securityEventService = securityEventService;
    }

    @GetMapping
    public Page<SecurityEventResponse> listEvents(
            @RequestParam(required = false) SecurityEventType eventType,
            @RequestParam(required = false) SecurityEventSeverity severity,
            @RequestParam(required = false) UUID userId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return securityEventService.listEvents(eventType, severity, userId, pageable);
    }
}

