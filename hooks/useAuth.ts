'use client';

import { useCallback } from 'react';
import { useAuthStore } from '@/services/stores/authStore';
import { logoutAction } from '@/app/(auth)/actions';

export function useAuth() {
  const { user, isAuthenticated, setUser, setError, clearError } = useAuthStore(
    (state) => state,
  );

  // Logout without useTransition - let the server action's redirect() work directly
  const logout = useCallback(async () => {
    // Clear Zustand store on client side first
    useAuthStore.getState().logout();
    // Call logout action which will sign out and redirect
    // The redirect() call in logoutAction is handled automatically by Next.js
    // Do not wrap in try-catch as redirect() throws intentional error for navigation
    await logoutAction();
  }, []);

  return {
    user,
    isAuthenticated,
    setUser,
    setError,
    clearError,
    logout,
  };
}
