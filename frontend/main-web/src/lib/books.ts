import apiClient from "./api-client";
import type { Page } from "./page";

export type BookDto = {
  id: string;
  isbn13: string | null;
  title: string;
  subtitle: string | null;
  ggId: string | null;
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

const RANDOM_POOL_SIZE = 48;

function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/** Picks `count` books of a category at random, so repeated visits show different titles. */
export async function fetchRandomBooksByCategory(
  category: string,
  count: number,
  excludeId?: string,
): Promise<BookDto[]> {
  const head = await searchBooks({ category, size: 1 });
  const pages = Math.max(1, Math.ceil(head.totalElements / RANDOM_POOL_SIZE));
  const pageIndex = Math.floor(Math.random() * pages);
  const pool = await searchBooks({ category, size: RANDOM_POOL_SIZE, page: pageIndex });
  const candidates = pool.content.filter((book) => book.id !== excludeId);
  return shuffleInPlace(candidates).slice(0, count);
}


export async function getBook(id: string): Promise<BookDto> {
  const response = await apiClient.get<BookDto>(`/api/v1/public/books/${id}`);
  return response.data;
}

export const fetchBook = getBook;

export async function fetchCategories(): Promise<string[]> {
  const response = await apiClient.get<string[]>("/api/v1/public/books/categories");
  return response.data;
}

/** Picks random books across the whole catalog (only ones with a cover image when `withCover`). */
export async function fetchRandomBooks(count: number, withCover = true): Promise<BookDto[]> {
  const head = await searchBooks({ size: 1 });
  const pages = Math.max(1, Math.ceil(head.totalElements / RANDOM_POOL_SIZE));
  const pageIndex = Math.floor(Math.random() * pages);
  const pool = await searchBooks({ size: RANDOM_POOL_SIZE, page: pageIndex });
  const candidates = withCover ? pool.content.filter((book) => Boolean(book.coverImageUrl)) : pool.content;
  return shuffleInPlace(candidates).slice(0, count);
}
