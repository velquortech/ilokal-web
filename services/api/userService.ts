import apiClient from './apiClient';
import { Profile, UserRole } from '@/lib/types/user';
import { PaginatedResponse } from './paginationService';

export interface CreateUserInput {
  email: string;
  full_name: string;
  password: string;
  phone_number?: string;
  avatar_url?: string;
  status?: 'active' | 'inactive' | 'suspended';
  verification_status?: 'pending' | 'verified' | 'suspended' | 'rejected';
  role: UserRole;
}

export interface UpdateUserInput extends Omit<
  CreateUserInput,
  'password' | 'role'
> {
  password?: string;
}

export interface AdminUpdateUserInput {
  email?: string;
  full_name?: string;
  phone_number?: string;
  avatar_url?: string;
  status?: 'active' | 'inactive' | 'suspended';
}

const userService = {
  async getProfilesByRole(role: UserRole): Promise<Profile[]> {
    try {
      const response = await apiClient.get(`/admin/profiles?role=${role}`);
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error(`Error fetching ${role} profiles:`, error);
      throw error;
    }
  },

  async getProfilesByRolePaginated(
    role: UserRole,
    page: number = 1,
    limit: number = 10,
    filters?: {
      searchQuery?: string;
      statusFilter?: 'all' | 'active' | 'inactive' | 'suspended';
      sortOrder?: 'latest' | 'oldest';
    },
  ): Promise<PaginatedResponse<Profile>> {
    try {
      const params = new URLSearchParams();
      params.append('role', role);
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      if (filters?.searchQuery) {
        params.append('search', filters.searchQuery);
      }
      if (filters?.statusFilter && filters.statusFilter !== 'all') {
        params.append('status', filters.statusFilter);
      }
      if (filters?.sortOrder) {
        params.append('sort', filters.sortOrder);
      }

      const response = await apiClient.get<PaginatedResponse<Profile>>(
        `/admin/profiles?${params.toString()}`,
      );

      if (
        response &&
        typeof response === 'object' &&
        'data' in response &&
        'pagination' in response
      ) {
        return response as unknown as PaginatedResponse<Profile>;
      }

      console.warn('Unexpected API response structure:', response);
      return {
        data: Array.isArray(response) ? response : [],
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalItems: 0,
          totalPages: 0,
        },
      };
    } catch (error) {
      console.error(`Error fetching paginated ${role} profiles:`, error);
      throw error;
    }
  },

  async getProfileById(id: string): Promise<Profile> {
    return await apiClient.get(`/admin/profiles/${id}`);
  },

  async createProfile(data: CreateUserInput): Promise<Profile> {
    return await apiClient.post('/admin/profiles', data);
  },

  async adminUpdateProfile(
    id: string,
    data: AdminUpdateUserInput,
  ): Promise<Profile> {
    return await apiClient.put(`/admin/profiles/${id}`, data);
  },

  async deleteProfile(id: string): Promise<{ message: string }> {
    return await apiClient.delete(`/admin/profiles/${id}`);
  },
};

export default userService;
