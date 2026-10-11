import apiClient from './api-client';
import type { PageResponse } from './books-api';

export interface LoanDTO {
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

export async function fetchMyLoans(params?: {
  status?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<LoanDTO>> {
  const response = await apiClient.get<PageResponse<LoanDTO>>('/api/v1/users/me/loans', {
    params: {
      ...params,
      size: params?.size ?? 100,
    },
  });
  return response.data;
}

export async function borrowBook(bookId: string): Promise<LoanDTO> {
  const response = await apiClient.post<LoanDTO>('/api/v1/users/me/loans', { bookId });
  return response.data;
}

export async function returnBook(loanId: string): Promise<LoanDTO> {
  const response = await apiClient.post<LoanDTO>(`/api/v1/users/me/loans/${loanId}/return`);
  return response.data;
}
