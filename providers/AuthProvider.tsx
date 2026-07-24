'use client';

import { useSessionMonitor } from '@/hooks/useSessionMonitor';
import { SessionTracker } from '@/components/SessionTracker';

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * ⚠️ NOT MOUNTED — this provider has zero render sites (verified 2026-07-24).
 * Nothing in `app/**` renders it, so `SessionTracker`, `useSessionMonitor`,
 * `SessionWarningDialog` and `config/sessionConfig.ts` are all currently dead:
 * role-based session timeouts and the expiry warning DO NOT run in production.
 * Wiring it into the business + admin shells is a tracked follow-up — it needs
 * QA on the `sessionConfig` timeout values and on the 60s polling + window
 * activity listeners. Until then, treat edits here as unverifiable at runtime.
 *
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
