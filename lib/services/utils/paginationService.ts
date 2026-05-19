/**
 * Pagination utilities and types
 */

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

/**
 * Calculate offset for pagination
 * @param page - Current page (1-indexed)
 * @param limit - Items per page
 * @returns Offset for database query
 */
export const getOffset = (page: number, limit: number): number =>
  (page - 1) * limit;

/**
 * Calculate total pages
 * @param totalItems - Total number of items
 * @param limit - Items per page
 * @returns Total number of pages
 */
export const getTotalPages = (totalItems: number, limit: number): number =>
  Math.ceil(totalItems / limit);

/**
 * Create paginated response
 * @param data - Array of items
 * @param currentPage - Current page number
 * @param pageSize - Items per page
 * @param totalItems - Total number of items
 */
export const createPaginatedResponse = <T>(
  data: T[],
  currentPage: number,
  pageSize: number,
  totalItems: number,
): PaginatedResponse<T> => ({
  data,
  pagination: {
    currentPage,
    pageSize,
    totalItems,
    totalPages: getTotalPages(totalItems, pageSize),
  },
});
