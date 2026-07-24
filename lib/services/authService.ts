import http from './client';
import { User } from '@/lib/types/user';

export type LoginResult = { user: User; message: string };

const authService = {
  async getMe(): Promise<User | null> {
    // Server fast-path: use server helper to fetch current user without HTTP
    if (typeof window === 'undefined') {
      try {
        const mod = await import('@/lib/api/getCurrentUser');
        const user = await mod.getCurrentUser();
        return user;
      } catch (err) {
        console.error('[authService.getMe] server fast-path error', err);
        return null;
      }
    }

    try {
      return await http.get<User>('/auth/me');
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'status' in err &&
        (err as { status?: number }).status === 401
      ) {
        return null;
      }
      throw err;
    }
  },

  async login(email: string, password: string): Promise<LoginResult> {
    return await http.post<LoginResult>('/auth/login', { email, password });
  },

  async logout(): Promise<{ message: string }> {
    return await http.post('/auth/logout');
  },

  async signup(data: {
    email: string;
    password: string;
    confirmPassword: string;
    name: string;
    role: 'admin' | 'business_owner' | 'app_user';
    phone_number?: string;
    avatar_url?: string;
  }): Promise<{ success: boolean; data?: unknown; error?: unknown }> {
    return await http.post('/auth/signup', data);
  },

  async resetPasswordRequest(email: string) {
    return await http.post('/auth/reset-password', { email });
  },

  async resetPasswordConfirm(tokenHash: string, password: string) {
    return await http.post('/auth/reset-password', {
      token_hash: tokenHash,
      password,
    });
  },

  async verifyEmail() {
    return await http.post('/auth/verify-email');
  },

  async refreshToken() {
    return await http.post('/auth/refresh-token');
  },
};

export default authService;
