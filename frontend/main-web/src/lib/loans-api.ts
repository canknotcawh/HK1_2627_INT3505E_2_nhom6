import apiClient from './api-client';
import type { PageResponse } from './books-api';

export interface LoanResponse {
  id: string;
  bookId: string;
  bookTitle: string;
  userId: string;
  borrowedAt: string;
  dueAt: string;
  returnedAt: string | null;
  status: string;
  renewedCount: number;
}

// Alias
export type Loan = LoanResponse;

export async function fetchMyLoans(params?: {
  status?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<LoanResponse>> {
  const response = await apiClient.get<PageResponse<LoanResponse>>('/api/v1/users/me/loans', {
    params: {
      ...params,
      size: params?.size ?? 100,
    },
  });
  return response.data;
}

export async function borrowBook(bookId: string): Promise<LoanResponse> {
  const response = await apiClient.post<LoanResponse>('/api/v1/users/me/loans', { bookId });
  return response.data;
}

export async function returnBook(loanId: string): Promise<LoanResponse> {
  const response = await apiClient.post<LoanResponse>(`/api/v1/users/me/loans/${loanId}/return`);
  return response.data;
}
