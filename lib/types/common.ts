/**
 * Common/Global Type Definitions
 *
 * Shared types used across API routes, services, and components
 * Centralized here for consistency and easy reuse
 *
 * TYPE HIERARCHY:
 * - All API responses use ApiResponse<T> wrapper for consistency
 * - Error responses always include error.code and error.message
 * - Success responses include data of type T
 * - Paginated responses use PaginatedResult<T> for list endpoints
 */

/**
 * Standard API Response wrapper for all endpoints
 *
 * Success example:
 * {
 *   success: true,
 *   data: { id: "123", email: "user@example.com", ... }
 * }
 *
 * Error example:
 * {
 *   success: false,
 *   error: {
 *     code: "VALIDATION_ERROR",
 *     message: "Invalid email address"
 *   }
 * }
 */
export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
};

/**
 * Standard error codes for API responses
 *
 * Use these codes in your API routes for consistent error handling:
 * - VALIDATION_ERROR: Input validation failed (400)
 * - AUTHENTICATION_ERROR: Auth required or invalid (401)
 * - AUTHORIZATION_ERROR: Insufficient permissions (403)
 * - NOT_FOUND: Resource not found (404)
 * - CONFLICT: Resource conflict / duplicate (409)
 * - INTERNAL_ERROR: Server error (500)
 * - Domain-specific: BUSINESS_NOT_FOUND, USER_ALREADY_EXISTS, etc.
 */
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'
  | (string & {}); // Allow domain-specific error codes

/**
 * Standard error response
 */
export type ApiError = {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
};

/**
 * Paginated response for list endpoints
 *
 * Example:
 * {
 *   items: [{ id: "1", ... }, { id: "2", ... }],
 *   total: 42,
 *   page: 1,
 *   limit: 10,
 *   hasMore: true
 * }
 */
export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};

/**
 * Standard paginated API response
 */
export type PaginatedApiResponse<T> = ApiResponse<PaginatedResult<T>>;

/**
 * Helper type for extracting data from ApiResponse
 * Usage: type UserData = ExtractData<ApiResponse<User>>;
 */
export type ExtractData<T> = T extends ApiResponse<infer U> ? U : never;
