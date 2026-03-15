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
      try {
        // Clear Zustand store on client side
        useAuthStore.getState().logout();
        // Execute server action to clear session and redirect
        // logoutAction() will call redirect() which throws internally
        // This is expected Next.js behavior and will navigate automatically
        await logoutAction();
      } catch (error) {
        // Handle any actual errors (redirect() throws but that's expected)
        if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
          // Expected redirect exception - navigation handled automatically
          return;
        }
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to logout';
        setError(errorMessage);
      }
    });
  }, [setError]);

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
