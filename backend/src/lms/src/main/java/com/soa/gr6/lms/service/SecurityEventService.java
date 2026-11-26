package com.soa.gr6.lms.service;

import com.soa.gr6.lms.domain.SecurityEventLog;
import com.soa.gr6.lms.domain.User;
import com.soa.gr6.lms.domain.enums.SecurityEventSeverity;
import com.soa.gr6.lms.domain.enums.SecurityEventType;
import com.soa.gr6.lms.dto.SecurityEventRequest;
import com.soa.gr6.lms.dto.SecurityEventResponse;
import com.soa.gr6.lms.repository.SecurityEventLogRepository;
import com.soa.gr6.lms.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class SecurityEventService {

    private static final Logger log = LoggerFactory.getLogger(SecurityEventService.class);

    private final SecurityEventLogRepository securityEventLogRepository;
    private final UserRepository userRepository;

    public SecurityEventService(
            SecurityEventLogRepository securityEventLogRepository,
            UserRepository userRepository) {
        this.securityEventLogRepository = securityEventLogRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public SecurityEventResponse recordEvent(
            UUID userId,
            String userEmail,
            SecurityEventRequest request,
            String ipAddress,
            String userAgent) {
        User user = (userId != null) ? userRepository.findById(userId).orElse(null) : null;
        String resolvedEmail = (userEmail != null && !userEmail.isBlank()) ? userEmail : "anonymous";

        SecurityEventLog event = new SecurityEventLog(
                user,
                resolvedEmail,
                request.eventType(),
                request.severity(),
                request.pageUrl(),
                request.bookId(),
                request.bookTitle(),
                request.details(),
                ipAddress,
                userAgent
        );

        SecurityEventLog saved = securityEventLogRepository.save(event);

        if (request.severity() == SecurityEventSeverity.HIGH || request.severity() == SecurityEventSeverity.CRITICAL) {
            log.warn("Suspicious event [{}] ({}) from user [{}] IP [{}] on [{}]: {}",
                    request.eventType(),
                    request.severity(),
                    resolvedEmail,
                    ipAddress,
                    request.pageUrl(),
                    request.details());
        }

        return SecurityEventResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public Page<SecurityEventResponse> listEvents(
            SecurityEventType eventType,
            SecurityEventSeverity severity,
            UUID userId,
            Pageable pageable) {
        return securityEventLogRepository.findFiltered(eventType, severity, userId, pageable)
                .map(SecurityEventResponse::from);
    }
}

