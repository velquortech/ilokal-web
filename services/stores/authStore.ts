import { create } from 'zustand';

/**
 * Zustand store for CLIENT-SIDE UI STATE ONLY
 *
 * ⚠️ IMPORTANT: Do NOT store sensitive data (user info, auth tokens, etc.)
 * Use Server Components and useActionState for auth state instead.
 *
 * This store is for temporary UI state:
 * - Form errors from Server Actions
 * - Loading states for client-side operations
 * - UI toggles, filters, etc.
 */

interface AuthUIState {
  // Form errors from Server Actions (temporary)
  error: string | null;

  // Actions
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthUIState>((set) => ({
  error: null,

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),
}));
