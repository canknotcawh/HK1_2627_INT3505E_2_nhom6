package com.soa.gr6.lms.domain;

import com.soa.gr6.lms.domain.enums.SecurityEventSeverity;
import com.soa.gr6.lms.domain.enums.SecurityEventType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "security_event_log")
@Getter
@Setter
@NoArgsConstructor
public class SecurityEventLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "user_email", length = 255, nullable = false)
    private String userEmail = "anonymous";

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", length = 50, nullable = false)
    private SecurityEventType eventType;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", length = 20, nullable = false)
    private SecurityEventSeverity severity;

    @Column(name = "page_url", length = 1000)
    private String pageUrl;

    @Column(name = "book_id")
    private UUID bookId;

    @Column(name = "book_title", length = 500)
    private String bookTitle;

    @Column(name = "details", columnDefinition = "TEXT")
    private String details;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", columnDefinition = "TEXT")
    private String userAgent;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public SecurityEventLog(
            User user,
            String userEmail,
            SecurityEventType eventType,
            SecurityEventSeverity severity,
            String pageUrl,
            UUID bookId,
            String bookTitle,
            String details,
            String ipAddress,
            String userAgent) {
        this.user = user;
        this.userEmail = (userEmail != null && !userEmail.isBlank()) ? userEmail : "anonymous";
        this.eventType = eventType;
        this.severity = severity;
        this.pageUrl = pageUrl;
        this.bookId = bookId;
        this.bookTitle = bookTitle;
        this.details = details;
        this.ipAddress = ipAddress;
        this.userAgent = userAgent;
        this.createdAt = Instant.now();
    }

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = Instant.now();
        }
    }
}

