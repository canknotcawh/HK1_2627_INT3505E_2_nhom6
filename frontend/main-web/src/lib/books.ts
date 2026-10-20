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
  ratingAvg?: number | null;
  ratingCount?: number;
  status: "ACTIVE" | "RETIRED";
  createdAt: string;
  updatedAt: string;
  authors?: string[];
  categories?: string[];
};

export type BookResponse = BookDto;
export type Book = BookDto;

export interface BookSearchParams {
  q?: string;
  category?: string;
  availability?: string;
  sort?: string;
  page?: number;
  size?: number;
}

export async function searchBooks(
  queryOrParams?: string | BookSearchParams,
  page = 0,
  size = 20
): Promise<Page<BookDto>> {
  let params: Record<string, unknown>;

  if (typeof queryOrParams === "string") {
    params = {
      q: queryOrParams.trim() || undefined,
      page,
      size,
    };
  } else if (queryOrParams && typeof queryOrParams === "object") {
    params = {
      q: queryOrParams.q?.trim() || undefined,
      category: queryOrParams.category || undefined,
      availability: queryOrParams.availability || undefined,
      sort: queryOrParams.sort || undefined,
      page: queryOrParams.page ?? 0,
      size: queryOrParams.size ?? 20,
    };
  } else {
    params = { page, size };
  }

  const response = await apiClient.get<Page<BookDto>>("/api/v1/public/books", { params });
  return response.data;
}

export const fetchBooks = searchBooks;

export async function getBook(id: string): Promise<BookDto> {
  const response = await apiClient.get<BookDto>(`/api/v1/public/books/${id}`);
  return response.data;
}

export const fetchBook = getBook;

export async function fetchCategories(): Promise<string[]> {
  const response = await apiClient.get<string[]>("/api/v1/public/books/categories");
  return response.data;
}
