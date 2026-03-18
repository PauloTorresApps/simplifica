import { PaginationParams, PaginatedResult } from '../types';

export function getPaginationParams(
  page?: number | string,
  limit?: number | string
): PaginationParams {
  const pageNumber = Number(page);
  const limitNumber = Number(limit);

  const parsedPage = Number.isFinite(pageNumber) ? Math.max(1, pageNumber) : 1;
  const parsedLimit = Number.isFinite(limitNumber)
    ? Math.min(100, Math.max(1, limitNumber))
    : 10;

  return {
    page: parsedPage,
    limit: parsedLimit,
  };
}

export function createPaginatedResult<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResult<T> {
  return {
    data,
    meta: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.ceil(total / params.limit),
    },
  };
}

export function getSkip(params: PaginationParams): number {
  return (params.page - 1) * params.limit;
}
