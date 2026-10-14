import apiClient from './api-client';


export interface BookResponse {
  id: string;
  isbn13: string | null;
  title: string;
  subtitle: string | null;
  description: string | null;
  language: string | null;
  publishedYear: number | null;
  pageCount: number | null;
  coverImageUrl: string | null;
  previewUrl: string | null;
  readerUrl: string | null;
  totalCopies: number;
  availableCopies: number;
  ratingAvg: number | null;
  ratingCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  authors: string[];
  categories: string[];
}

// Alias
export type Book = BookResponse;

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export async function fetchBooks(params?: {
  q?: string;
  category?: string;
  availability?: string;
  page?: number;
  size?: number;
  sort?: string;
}): Promise<PageResponse<BookResponse>> {
  const response = await apiClient.get<PageResponse<BookResponse>>('/api/v1/public/books', {
    params: {
      ...params,
      size: params?.size ?? 100,
    },
  });
  return response.data;
}

export async function fetchCategories(): Promise<string[]> {
  const response = await apiClient.get<string[]>('/api/v1/public/books/categories');
  return response.data;
}

export async function fetchBook(bookId: string): Promise<BookResponse> {
  const response = await apiClient.get<BookResponse>(`/api/v1/public/books/${bookId}`);
  return response.data;
}
