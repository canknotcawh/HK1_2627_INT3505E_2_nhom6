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

export interface Book {
  id: string;
  title: string;
  authors: string[];
  author: string;
  isbn: string | null;
  publishYear: number | null;
  rating: number;
  ratingCount: number;
  categories: string[];
  category: string;
  quantity: number;
  coverUrl: string | null;
  subtitle: string | null;
  description: string | null;
  language: string | null;
  pageCount: number | null;
  status: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export function mapBook(dto: BookDTO): Book {
  return {
    id: dto.id,
    title: dto.title,
    authors: dto.authors ?? [],
    author: (dto.authors ?? [])[0] ?? '',
    isbn: dto.isbn13,
    publishYear: dto.publishedYear,
    rating: dto.ratingAvg != null ? Number(dto.ratingAvg) : 0,
    ratingCount: dto.ratingCount ?? 0,
    categories: dto.categories ?? [],
    category: (dto.categories ?? [])[0] ?? '',
    quantity: dto.availableCopies,
    coverUrl: dto.coverImageUrl,
    subtitle: dto.subtitle,
    description: dto.description,
    language: dto.language,
    pageCount: dto.pageCount,
    status: dto.status,
  };
}

export async function fetchBooks(params?: {
  q?: string;
  category?: string;
  availability?: string;
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

export async function fetchCategories(): Promise<string[]> {
  const response = await apiClient.get<string[]>('/api/v1/public/books/categories');
  return response.data;
}

export async function fetchBook(bookId: string): Promise<BookDTO> {
  const response = await apiClient.get<BookDTO>(`/api/v1/public/books/${bookId}`);
  return response.data;
}
