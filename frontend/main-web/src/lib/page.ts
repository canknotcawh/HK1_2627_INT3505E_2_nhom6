export type Page<T> = {
  content: T[];
  number: number;
  totalPages: number;
  totalElements: number;
};
