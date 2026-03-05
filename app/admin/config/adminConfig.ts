/**
 * Admin panel configuration constants
 */

export const ADMIN_CONFIG = {
  // Pagination
  ITEMS_PER_PAGE: 10,

  // React Query
  QUERY_STALE_TIME: 5 * 60 * 1000, // 5 minutes

  // Debouncing
  SEARCH_DEBOUNCE_MS: 300,

  // Status filter options
  STATUS_FILTERS: ['all', 'active', 'inactive', 'suspended'] as const,

  // Sort options
  SORT_OPTIONS: ['latest', 'oldest'] as const,
} as const;

export type StatusFilter = (typeof ADMIN_CONFIG.STATUS_FILTERS)[number];
export type SortOrder = (typeof ADMIN_CONFIG.SORT_OPTIONS)[number];
