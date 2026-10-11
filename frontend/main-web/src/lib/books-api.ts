import apiClient from './api-client';

export interface BookDTO {
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

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export async function fetchBooks(params?: {
  q?: string;
  page?: number;
  size?: number;
  sort?: string;
}): Promise<PageResponse<BookDTO>> {
  const response = await apiClient.get<PageResponse<BookDTO>>('/api/v1/public/books', {
    params: {
      ...params,
      size: params?.size ?? 100,
    },
  });
  return response.data;
}

export async function fetchBook(bookId: string): Promise<BookDTO> {
  const response = await apiClient.get<BookDTO>(`/api/v1/public/books/${bookId}`);
  return response.data;
}
