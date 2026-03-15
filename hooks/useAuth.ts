'use client';

import { useTransition, useCallback } from 'react';
import { useAuthStore } from '@/services/stores/authStore';
import { logoutAction } from '@/app/(auth)/actions';

export function useAuth() {
  const [isPending, startTransition] = useTransition();
  const { user, isAuthenticated, setUser, setError, clearError } = useAuthStore(
    (state) => state,
  );

  // Use useTransition for better server action handling
  const logout = useCallback(() => {
    startTransition(async () => {
      // Clear Zustand store on client side
      useAuthStore.getState().logout();
      // Execute server action to clear session and redirect
      // logoutAction() calls redirect() which useTransition handles automatically
      // Don't wrap in try-catch - let useTransition handle the redirect
      await logoutAction();
    });
  }, []);

  return {
    user,
    isAuthenticated,
    setUser,
    setError,
    clearError,
    logout,
    isLoading: isPending,
  };
}
