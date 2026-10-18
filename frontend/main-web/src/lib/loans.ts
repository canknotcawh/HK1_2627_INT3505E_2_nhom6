import apiClient from "./api-client";
import type { Page } from "./page";

export type LoanStatus = "ACTIVE" | "RETURNED" | "OVERDUE" | "LOST" | "PENDING_RETURN";

export type LoanDto = {
  id: string;
  bookId: string;
  bookTitle: string;
  userId: string;
  userEmail: string;
  userFullName: string;
  borrowedAt: string;
  dueAt: string;
  returnedAt: string | null;
  status: LoanStatus;
  renewedCount: number;
};

export async function listMyLoans(status?: LoanStatus, page = 0, size = 100): Promise<Page<LoanDto>> {
  const response = await apiClient.get<Page<LoanDto>>("/api/v1/users/me/loans", {
    params: { status, page, size },
  });
  return response.data;
}

export async function borrowBook(bookId: string): Promise<LoanDto> {
  const response = await apiClient.post<LoanDto>("/api/v1/users/me/loans", { bookId });
  return response.data;
}

export async function requestReturn(loanId: string): Promise<LoanDto> {
  const response = await apiClient.post<LoanDto>(`/api/v1/users/me/loans/${loanId}/return`);
  return response.data;
}

export async function renewLoan(loanId: string): Promise<LoanDto> {
  const response = await apiClient.post<LoanDto>(`/api/v1/users/me/loans/${loanId}/renew`);
  return response.data;
}
