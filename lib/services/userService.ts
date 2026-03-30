import http from './client';
import { Profile, UserRole } from '@/lib/types/user';

export default {
  async getMe(): Promise<Profile | null> {
    try {
      return await http.get<Profile>('/auth/me');
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

  async getProfilesByRole(role: UserRole): Promise<Profile[]> {
    return await http.get<Profile[]>(`/admin/profiles?role=${role}`);
  },
};
