import apiClient from "./api-client";
import type { Page } from "./page";

export interface ReviewResponse {
  id: string;
  bookId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string | null;
  status: "VISIBLE" | "HIDDEN_BY_ADMIN" | "DELETED";
  createdAt: string;
  updatedAt: string;
}

export interface ReviewStatsResponse {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<string, number>;
}

export interface ReviewEligibilityResponse {
  eligible: boolean;
  alreadyReviewed: boolean;
  reason: string | null;
}

export interface ReviewRequest {
  rating: number;
  comment?: string | null;
}

export async function getBookReviews(
  bookId: string,
  page = 0,
  size = 10
): Promise<Page<ReviewResponse>> {
  const response = await apiClient.get<Page<ReviewResponse>>(
    `/api/v1/public/books/${bookId}/reviews`,
    {
      params: { page, size },
    }
  );
  return response.data;
}

export async function getBookReviewStats(
  bookId: string
): Promise<ReviewStatsResponse> {
  const response = await apiClient.get<ReviewStatsResponse>(
    `/api/v1/public/books/${bookId}/reviews/stats`
  );
  return response.data;
}

export async function checkReviewEligibility(
  bookId: string
): Promise<ReviewEligibilityResponse> {
  const response = await apiClient.get<ReviewEligibilityResponse>(
    `/api/v1/books/${bookId}/reviews/eligibility`
  );
  return response.data;
}

export async function getMyReview(
  bookId: string
): Promise<ReviewResponse | null> {
  try {
    const response = await apiClient.get<ReviewResponse>(
      `/api/v1/books/${bookId}/reviews/me`
    );
    return response.data;
  } catch (error: any) {
    if (error?.response?.status === 404 || error?.response?.status === 204) {
      return null;
    }
    throw error;
  }
}

export async function createReview(
  bookId: string,
  data: ReviewRequest
): Promise<ReviewResponse> {
  const response = await apiClient.post<ReviewResponse>(
    `/api/v1/books/${bookId}/reviews`,
    data
  );
  return response.data;
}

export async function updateReview(
  reviewId: string,
  data: ReviewRequest
): Promise<ReviewResponse> {
  const response = await apiClient.put<ReviewResponse>(
    `/api/v1/reviews/${reviewId}`,
    data
  );
  return response.data;
}

export async function deleteReview(reviewId: string): Promise<void> {
  await apiClient.delete(`/api/v1/reviews/${reviewId}`);
}

