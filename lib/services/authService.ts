import http from './client';
import { User } from '@/lib/types/user';

export type LoginResult = { user: User; message: string };

const authService = {
  async getMe(): Promise<User | null> {
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
};

export default authService;
