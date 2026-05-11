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

// NOTE: Type definitions have been consolidated in lib/types/admin.ts
// Use AdminStatusFilter, AdminSortOrder, and AdminTabFilterState from there
// to avoid duplication and maintain single source of truth
