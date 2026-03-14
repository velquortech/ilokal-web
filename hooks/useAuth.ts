'use client';

import { useTransition, useCallback } from 'react';
import { useAuthStore } from '@/services/stores/authStore';
import { useRouter } from 'next/navigation';
import { logoutAction } from '@/app/(auth)/actions';
import { ROUTES } from '@/config/routeConfig';

export function useAuth() {
  const router = useRouter();
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
        // Execute server action to clear session
        await logoutAction();
        // Redirect after successful logout
        router.push(ROUTES.AUTH.LOGIN);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to logout';
        setError(errorMessage);
      }
    });
  }, [router, setError]);

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
