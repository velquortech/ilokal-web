'use client';

import { useCallback } from 'react';
import { logoutAction } from '@/app/(auth)/actions';

/**
 * useAuth - Minimal hook for logout functionality
 *
 * Auth state should come from:
 * - Server Components (passing user as prop)
 * - useActionState for form handling
 * - NOT from global state (Zustand)
 */
export function useAuth() {
  const logout = useCallback(async () => {
    // Call logout action which will sign out and redirect
    // The redirect() call in logoutAction is handled automatically by Next.js
    // Do not wrap in try-catch as redirect() throws intentional error for navigation
    await logoutAction();
  }, []);

  return {
    logout,
  };
}
