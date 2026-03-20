'use client';

import { useSessionMonitor } from '@/hooks/useSessionMonitor';
import { SessionTracker } from '@/components/SessionTracker';

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * AuthProvider - Minimal setup for monitoring session
 *
 * Auth state is now handled by:
 * - Server Components using verifySessionAction()
 * - useActionState for form handling
 * - Zustand only for UI state (no sensitive auth data)
 *
 * Session tracking:
 * - SessionTracker: Initializes session expiration in localStorage on mount
 * - useSessionMonitor: Monitors session validity and shows warnings
 */
export function AuthProvider({ children }: AuthProviderProps) {
  // Initialize session monitoring hook for auto-logout on expiration
  useSessionMonitor();

  return (
    <>
      <SessionTracker />
      {children}
    </>
  );
}
