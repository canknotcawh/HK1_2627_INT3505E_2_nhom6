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

export type ReadingPurpose = "READ" | "PREVIEW";

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
