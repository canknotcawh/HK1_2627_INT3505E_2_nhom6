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

const recentEvents = new Map<string, number>();

/**
 * Gửi hành vi đọc lên backend (không chặn UI, không ném lỗi).
 * Bỏ qua bản trùng trong 800ms để StrictMode/React re-render không nhân đôi sự kiện.
 */
export function sendReadingEvent(url: string, event: ReadingEventType, detail?: string) {
  const key = `${url}|${event}`;
  const now = Date.now();
  const last = recentEvents.get(key) ?? 0;
  if (now - last < 800) return;
  recentEvents.set(key, now);
  try {
    void fetch(`${readerFileUrl(url)}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, ...(detail ? { detail } : {}) }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Theo dõi hành vi không bao giờ được làm hỏng việc đọc.
  }
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
