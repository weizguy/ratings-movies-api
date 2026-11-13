export const DEFAULT_PAGE_SIZE = 50;

export interface PageQuery { limit: number; offset: number; }

export interface Paginated<T> {
  results: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export function parsePage(raw: unknown): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

export function toPageQuery(page: number, pageSize: number): PageQuery {
  return { limit: pageSize, offset: (page - 1) * pageSize };
}

export function paginate<T>(results: T[], total: number, page: number, pageSize: number): Paginated<T> {
  return {
    results,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}