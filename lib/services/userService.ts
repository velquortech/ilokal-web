import http from './client';
import type {
  Profile,
  UserRole,
  DatabaseInsertProfile,
  DatabaseUpdateProfile,
} from '@/lib/types';
import type { PaginatedResponse } from '@/services';

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

  async getProfilesByRolePaginated(
    role: UserRole,
    page: number = 1,
    limit: number = 10,
    filters?: {
      searchQuery?: string;
      statusFilter?: string;
      sortOrder?: string;
    },
  ): Promise<PaginatedResponse<Profile>> {
    const params = new URLSearchParams();
    params.append('role', role);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    if (filters?.searchQuery) params.append('search', filters.searchQuery);
    if (filters?.statusFilter && filters.statusFilter !== 'all')
      params.append('status', filters.statusFilter);
    if (filters?.sortOrder) params.append('sort', filters.sortOrder);

    return await http.get<PaginatedResponse<Profile>>(
      `/admin/profiles?${params.toString()}`,
    );
  },

  async getProfileById(id: string): Promise<Profile> {
    return await http.get(`/admin/profiles/${id}`);
  },

  async createProfile(data: DatabaseInsertProfile): Promise<Profile> {
    return await http.post<Profile>('/admin/profiles', data);
  },

  async adminUpdateProfile(
    id: string,
    data: DatabaseUpdateProfile,
  ): Promise<Profile> {
    return await http.put<Profile>(`/admin/profiles/${id}`, data);
  },

  async deleteProfile(id: string): Promise<{ message: string }> {
    return await http.del(`/admin/profiles/${id}`);
  },
  async updateCurrentProfile(data: DatabaseUpdateProfile): Promise<Profile> {
    return await http.put<Profile>('/auth/me', data);
  },
};
