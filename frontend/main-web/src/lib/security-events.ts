import apiClient from "./api-client";
import { getAccessToken } from "./auth-tokens";

export type SecurityEventType =
  | "DEVTOOLS_DETECTED"
  | "WATERMARK_TAMPERED"
  | "SHORTCUT_BLOCKED"
  | "CONTEXT_MENU_BLOCKED"
  | "PREVIEW_FOCUS_LOST"
  | "PRINT_ATTEMPT";

export type SecurityEventSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ReportSecurityEventPayload = {
  eventType: SecurityEventType;
  severity: SecurityEventSeverity;
  bookId?: string;
  bookTitle?: string;
  details?: string;
};

const DEDUP_WINDOW_MS = 3000;
const recentEvents = new Map<string, number>();

/**
 * Reports a suspicious client-side security event to the backend audit log for authenticated users.
 * Silently skips guest sessions, swallows network errors, and throttles duplicate bursts.
 */
export function reportSecurityEvent(payload: ReportSecurityEventPayload): void {
  if (!getAccessToken()) {
    return;
  }

  const key = `${payload.eventType}|${payload.bookId ?? ""}|${payload.details ?? ""}`;
  const now = Date.now();
  const lastSent = recentEvents.get(key);
  if (lastSent !== undefined && now - lastSent < DEDUP_WINDOW_MS) {
    return;
  }
  recentEvents.set(key, now);

  void apiClient
    .post("/api/v1/security-events", {
      eventType: payload.eventType,
      severity: payload.severity,
      pageUrl: window.location.pathname + window.location.search,
      bookId: payload.bookId,
      bookTitle: payload.bookTitle,
      details: payload.details,
    })
    .catch(() => undefined);
}

