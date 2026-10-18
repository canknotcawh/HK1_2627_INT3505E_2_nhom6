import apiClient from "./api-client";
import type { Page } from "./page";

export type BookDto = {
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
  status: "ACTIVE" | "RETIRED";
  createdAt: string;
  updatedAt: string;
};

export async function searchBooks(q: string, page = 0, size = 20): Promise<Page<BookDto>> {
  const response = await apiClient.get<Page<BookDto>>("/api/v1/public/books", {
    params: { q: q.trim() || undefined, page, size },
  });
  return response.data;
}

export async function getBook(id: string): Promise<BookDto> {
  const response = await apiClient.get<BookDto>(`/api/v1/public/books/${id}`);
  return response.data;
}
