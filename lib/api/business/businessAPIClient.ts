/**
 * Business API Client
 *
 * Client for server-side calls to /api/admin/businesses endpoints.
 * Used by server actions to avoid code duplication.
 * Centralizes business management logic in API routes.
 */

import { AdminBusiness, PaginatedBusinessResponse } from '@/lib/types/business';

const API_BASE = '/api/admin/businesses';

// ============================================================================
// TYPES
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ApiListResponse<T> {
  success: boolean;
  data?: T[];
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  counts?: Record<string, number>;
  error?: string;
}

// ============================================================================
// HELPER FUNCTION
// ============================================================================

/**
 * Generic fetch helper for API calls
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<{ data?: T; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      return { error: result.error || `API error: ${response.status}` };
    }

    return { data: result };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'API request failed',
    };
  }
}

// ============================================================================
// FETCH OPERATIONS
// ============================================================================

/**
 * Get paginated businesses with filters
 */
export async function getBusinessesList(
  filters: Partial<Record<string, string | number>> = {},
): Promise<{ data?: PaginatedBusinessResponse; error?: string }> {
  const params = new URLSearchParams();

  if (filters.status) params.append('status', String(filters.status));
  if (filters.search) params.append('search', String(filters.search));
  if (filters.sortBy) params.append('sortBy', String(filters.sortBy));
  if (filters.sortOrder) params.append('sortOrder', String(filters.sortOrder));
  if (filters.page) params.append('page', String(filters.page));
  if (filters.pageSize) params.append('pageSize', String(filters.pageSize));

  const queryString = params.toString();
  const endpoint = queryString ? `?${queryString}` : '';

  return apiFetch<PaginatedBusinessResponse>(endpoint);
}

/**
 * Get single business by ID
 */
export async function getBusiness(
  businessId: string,
): Promise<{ data?: AdminBusiness; error?: string }> {
  return apiFetch<AdminBusiness>(`/${businessId}`);
}

// ============================================================================
// VERIFICATION & STATUS ACTIONS
// ============================================================================

/**
 * Verify a business
 */
export async function verifyBusiness(
  businessId: string,
  notes?: string,
): Promise<{ data?: AdminBusiness; error?: string }> {
  return apiFetch<AdminBusiness>(`/${businessId}/verify`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });
}

/**
 * Reject a business
 */
export async function rejectBusiness(
  businessId: string,
  reason?: string,
): Promise<{ data?: AdminBusiness; error?: string }> {
  return apiFetch<AdminBusiness>(`/${businessId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

/**
 * Suspend a business
 */
export async function suspendBusiness(
  businessId: string,
  reason?: string,
): Promise<{ data?: AdminBusiness; error?: string }> {
  return apiFetch<AdminBusiness>(`/${businessId}/suspend`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

/**
 * Reactivate a suspended business
 */
export async function reactivateBusiness(
  businessId: string,
): Promise<{ data?: AdminBusiness; error?: string }> {
  return apiFetch<AdminBusiness>(`/${businessId}/reactivate`, {
    method: 'POST',
  });
}

// ============================================================================
// UPDATE & DELETE OPERATIONS
// ============================================================================

/**
 * Update business
 */
export async function updateBusiness(
  businessId: string,
  updates: Partial<Record<string, string | number | boolean>>,
): Promise<{ data?: AdminBusiness; error?: string }> {
  return apiFetch<AdminBusiness>(`/${businessId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

/**
 * Archive a business (soft delete)
 */
export async function archiveBusiness(
  businessId: string,
): Promise<{ error?: string }> {
  return apiFetch(`/${businessId}`, {
    method: 'DELETE',
  });
}

/**
 * Permanently delete a business (hard delete)
 */
export async function deleteBusinessPermanently(
  businessId: string,
): Promise<{ error?: string }> {
  return apiFetch(`/${businessId}/delete`, {
    method: 'DELETE',
  });
}
