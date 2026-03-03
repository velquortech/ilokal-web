/**
 * Session Configuration and Timeouts
 *
 * Security recommendations based on OWASP standards:
 * - Admin: Short timeout (sensitive operations)
 * - Business Owner: Standard timeout
 * - User: Extended timeout
 */

// Session timeout in minutes
export const SESSION_TIMEOUTS = {
  // Admin: 1 hour - strict for security-sensitive access
  admin: parseInt(process.env.NEXT_PUBLIC_SESSION_ADMIN_TIMEOUT || '60', 10),

  // Business Owner: 4 hours - moderate for business operations
  business_owner: parseInt(
    process.env.NEXT_PUBLIC_SESSION_BUSINESS_TIMEOUT || '240',
    10,
  ),

  // Regular User: 24 hours - long for customer convenience
  user: parseInt(process.env.NEXT_PUBLIC_SESSION_USER_TIMEOUT || '1440', 10),
} as const;

// Warning interval in minutes (show popup when session about to expire)
export const SESSION_WARNING_INTERVAL = parseInt(
  process.env.NEXT_PUBLIC_SESSION_WARNING_INTERVAL || '5',
  10,
);

// Check interval in milliseconds (how often to check session validity)
export const SESSION_CHECK_INTERVAL = 60000; // 1 minute

/**
 * Get session timeout for a specific user role
 * Returns timeout in minutes
 */
export function getSessionTimeout(role: string | undefined): number {
  if (!role) return SESSION_TIMEOUTS.user;

  // Type-safe role check
  if (role === 'admin') return SESSION_TIMEOUTS.admin;
  if (role === 'business_owner') return SESSION_TIMEOUTS.business_owner;

  return SESSION_TIMEOUTS.user;
}

/**
 * Calculate expiration time in milliseconds
 */
export function getExpirationTime(timeoutMinutes: number): number {
  return Date.now() + timeoutMinutes * 60 * 1000;
}

/**
 * Check if session has expired
 */
export function isSessionExpired(expirationTime: number): boolean {
  return Date.now() > expirationTime;
}

/**
 * Check if session is about to expire (within warning interval)
 */
export function isSessionExpiring(expirationTime: number): boolean {
  const warningTimeMs = SESSION_WARNING_INTERVAL * 60 * 1000;
  return (
    Date.now() > expirationTime - warningTimeMs && Date.now() <= expirationTime
  );
}

/**
 * Get time remaining in minutes
 */
export function getTimeRemaining(expirationTime: number): number {
  const remaining = Math.floor((expirationTime - Date.now()) / 60000);
  return Math.max(0, remaining);
}
