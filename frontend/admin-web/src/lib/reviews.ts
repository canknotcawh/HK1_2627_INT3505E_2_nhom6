import apiClient from "./api-client";
import type { Page } from "./page";

export type ReviewStatus = "VISIBLE" | "HIDDEN_BY_ADMIN" | "DELETED";

export interface AdminReview {
  id: string;
  bookId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string | null;
}

export async function listAdminReviews(page = 0, size = 10): Promise<Page<AdminReview>> {
  const response = await apiClient.get<Page<AdminReview>>("/admin/reviews", {
    params: { page, size, sort: "createdAt,desc" },
  });
  return response.data;
}

export async function hideReview(reviewId: string): Promise<void> {
  await apiClient.patch(`/admin/reviews/${reviewId}/hide`);
}

export async function restoreReview(reviewId: string): Promise<void> {
  await apiClient.patch(`/admin/reviews/${reviewId}/restore`);
}

export async function deleteReview(reviewId: string): Promise<void> {
  await apiClient.delete(`/admin/reviews/${reviewId}`);
}

