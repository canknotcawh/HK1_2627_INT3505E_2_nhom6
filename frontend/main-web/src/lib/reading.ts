import { isAxiosError } from "axios";
import apiClient from "./api-client";

export type ReadingAccess = {
  canRead: boolean;
  canPreview: boolean;
  loanId: string | null;
  dueAt: string | null;
  hasFullFile: boolean;
  hasPreviewFile: boolean;
};

export type CanaryLink = {
  url: string;
  expiresAt: string;
  tokenSuffix: string;
  watermarkText: string;
  fileName: string;
};

type ReadingPurpose = "READ" | "PREVIEW";

/** Hành vi của người đọc trên bản PDF, ghi nhận cho trang admin canary. */
export type ReadingEventType = "OPEN" | "CLOSE" | "RELOAD" | "SUSPICIOUS";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//localhost:8080`).replace(/\/$/, "");

/** URL tuyệt đối tới endpoint stream canary (link backend trả về là đường dẫn tương đối). */
export function readerFileUrl(url: string) {
  return url.startsWith("http") ? url : `${apiBaseUrl}${url}`;
}

/**
 * Body dạng form thay vì JSON: trình duyệt gửi thẳng được (CORS "simple request", không preflight)
 * nên cả fetch keepalive lẫn sendBeacon lúc đóng tab đều tới server.
 */
function eventBody(event: ReadingEventType, detail?: string) {
  const body = new URLSearchParams({ event });
  if (detail) body.set("detail", detail);
  return body;
}

const recentEvents = new Map<string, number>();

/**
 * Token đã báo CLOSE. Đóng bản đọc, đóng tab lẫn lần quay lại từ bfcache đều có thể cùng kết
 * thúc một phiên, nên mỗi phiên chỉ ghi đúng một CLOSE; OPEN của phiên mới mở lại cờ này.
 */
const closedSessions = new Set<string>();

function deliver(url: string, event: ReadingEventType, detail?: string) {
  try {
    void fetch(`${readerFileUrl(url)}/events`, {
      method: "POST",
      body: eventBody(event, detail),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Theo dõi hành vi không bao giờ được làm hỏng việc đọc.
  }
}

/**
 * Gửi hành vi đọc lên backend (không chặn UI, không ném lỗi).
 * Bỏ qua bản trùng trong 800ms để StrictMode/React re-render không nhân đôi sự kiện.
 */
export function sendReadingEvent(url: string, event: ReadingEventType, detail?: string) {
  if (event === "CLOSE" && closedSessions.has(url)) return;
  const key = `${url}|${event}`;
  const now = Date.now();
  if (now - (recentEvents.get(key) ?? 0) < 800) return;
  if (recentEvents.size > 40) {
    for (const [seenKey, seenAt] of recentEvents) {
      if (now - seenAt > 5_000) recentEvents.delete(seenKey);
    }
  }
  recentEvents.set(key, now);
  if (event === "OPEN") closedSessions.delete(url);
  if (event === "CLOSE") closedSessions.add(url);
  deliver(url, event, detail);
}

/**
 * Báo CLOSE khi tab bị đóng/điều hướng đi: lúc đó cleanup của React không chạy, còn fetch thường
 * thì bị trình duyệt cắt. sendBeacon vẫn gửi nốt request sau khi trang đã bị huỷ.
 */
export function sendReadingCloseBeacon(url: string) {
  if (closedSessions.has(url)) return;
  closedSessions.add(url);
  try {
    if (navigator.sendBeacon(`${readerFileUrl(url)}/events`, eventBody("CLOSE"))) return;
  } catch {
    // Trình duyệt chặn beacon: rơi xuống fetch keepalive bên dưới.
  }
  deliver(url, "CLOSE");
}

export async function getReadingAccess(bookId: string): Promise<ReadingAccess> {
  const response = await apiClient.get<ReadingAccess>(`/api/v1/users/me/books/${bookId}/reading-access`);
  return response.data;
}

export async function requestReadingLink(bookId: string, purpose: ReadingPurpose): Promise<CanaryLink> {
  const response = await apiClient.post<CanaryLink>(`/api/v1/users/me/books/${bookId}/access`, { purpose });
  return response.data;
}

export function readingErrorMessage(error: unknown): string {
  if (isAxiosError<{ code?: string; message?: string }>(error)) {
    const status = error.response?.status;
    if (status === 403) return "Bạn không còn quyền đọc sách này (cần phiên mượn đang hiệu lực).";
    if (status === 409) return "Sách chưa có bản PDF để đọc.";
    if (status === 410) return "Phiên đọc đã hết hạn. Hãy mở lại bản đọc.";
    if (status === 429) return "Bạn thao tác quá nhanh, thử lại sau ít phút.";
    return error.response?.data?.message || "Không mở được bản đọc. Vui lòng thử lại.";
  }
  return "Không kết nối được backend. Kiểm tra kết nối rồi thử lại.";
}
