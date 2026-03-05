import { useAuthStore } from '@/lib/stores/authStore';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import authService from '@/lib/api/authService';
import { ROUTES } from '@/config/routeConfig';

export function useAuth() {
  const router = useRouter();
  const {
    user,
    isLoading,
    isAuthenticated,
    error,
    setUser,
    setIsLoading,
    setError,
    logout: zustandLogout,
    clearError,
  } = useAuthStore((state) => state);

  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      await authService.logout();
      zustandLogout();
      router.push(ROUTES.AUTH.LOGIN);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to logout';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, zustandLogout, router, setError]);

  return {
    user,
    isLoading,
    isAuthenticated,
    error,
    setUser,
    setError,
    clearError,
    logout,
  };
}
