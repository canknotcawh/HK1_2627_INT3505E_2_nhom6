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
