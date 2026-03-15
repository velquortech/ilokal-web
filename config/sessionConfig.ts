/**
 * Session Configuration & Utilities
 *
 * Defines session timeout behavior for different user roles and provides utilities
 * for session expiration validation on the client side.
 *
 * Security Model:
 * - HTTP-only auth cookie managed by Supabase (cannot be accessed/forged by JavaScript)
 * - Middleware verifies auth on every route change
 * - Client-side monitoring provides user feedback and warning dialogs
 * - Session expiration is tracked server-side, not in client cookies
 */

// ============================================================================
// SESSION TIMEOUT CONFIGURATION BY ROLE
// ============================================================================

/**
 * Session timeout durations in minutes based on user role
 * These control how long a session remains valid with no activity
 */
export const SESSION_TIMEOUTS: Record<string, number> = {
  admin: 60, // 1 hour - admins often perform rapid operations
  business_owner: 240, // 4 hours - business users may work longer sessions
  app_user: 1440, // 24 hours - casual users get extended sessions
  default: 30, // 30 minutes - fallback if role is unknown
};

/**
 * Get session timeout in minutes for a specific role
 * @param role - User role (admin, business_owner, app_user)
 * @returns Timeout in minutes
 */
export function getSessionTimeout(role?: string): number {
  if (!role) return SESSION_TIMEOUTS.default;
  return SESSION_TIMEOUTS[role] ?? SESSION_TIMEOUTS.default;
}

/**
 * Convert timeout from minutes to milliseconds
 * @param minutes - Timeout duration in minutes
 * @returns Timeout in milliseconds
 */
export function minutesToMs(minutes: number): number {
  return minutes * 60 * 1000;
}

// ============================================================================
// SESSION VERIFICATION INTERVALS & WARNINGS
// ============================================================================

/**
 * How often to check if session is still valid (in milliseconds)
 * Interval between calls to verifySessionAction()
 * Set to 60 seconds for reasonable balance between responsiveness and server load
 */
export const SESSION_CHECK_INTERVAL = 60 * 1000; // 60 seconds

/**
 * How long before session expires to show warning dialog (in minutes)
 * Warning appears when time remaining < this threshold
 * Example: If timeout is 30 minutes, warning appears at 5 minutes remaining
 */
export const SESSION_WARNING_THRESHOLD = 5; // minutes

/**
 * Debounce delay for activity detection (in milliseconds)
 * Prevents excessive session refresh calls from rapid user interactions
 * Example: Scrolling won't trigger refresh more than once per 5 seconds
 */
export const ACTIVITY_DEBOUNCE_DELAY = 5000; // 5 seconds

// ============================================================================
// SESSION STATE VALIDATION UTILITIES
// ============================================================================

/**
 * Check if a session has expired based on expiration timestamp
 * Used on client-side to determine if session is completely invalid
 *
 * @param expirationTime - Millisecond timestamp when session expires
 * @returns true if current time is past expiration time
 */
export function isSessionExpired(expirationTime: number): boolean {
  return Date.now() > expirationTime;
}

/**
 * Check if a session is expiring soon (within warning threshold)
 * Used to trigger warning dialog for user
 *
 * @param expirationTime - Millisecond timestamp when session expires
 * @returns true if time remaining is less than warning threshold
 */
export function isSessionExpiring(expirationTime: number): boolean {
  const warningThresholdMs = SESSION_WARNING_THRESHOLD * 60 * 1000;
  const timeRemaining = expirationTime - Date.now();
  return timeRemaining > 0 && timeRemaining < warningThresholdMs;
}

/**
 * Calculate how many minutes remain until session expires
 * Used to display "Time remaining: X minutes" in warning dialog
 *
 * @param expirationTime - Millisecond timestamp when session expires
 * @returns Time remaining in minutes (rounded down)
 */
export function getTimeRemaining(expirationTime: number): number {
  const msRemaining = Math.max(0, expirationTime - Date.now());
  return Math.floor(msRemaining / (60 * 1000));
}

/**
 * Calculate session expiration time based on timeout duration
 * Commonly used when initializing or refreshing session
 *
 * @param timeoutMinutes - Session timeout in minutes
 * @returns Millisecond timestamp of expiration
 */
export function calculateSessionExpiration(timeoutMinutes: number): number {
  return Date.now() + minutesToMs(timeoutMinutes);
}
