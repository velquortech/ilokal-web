import apiClient from './apiClient';
import { Profile, UserRole } from '@/lib/types/user';
import { PaginatedResponse } from './paginationService';

export interface CreateUserInput {
  email: string;
  full_name: string;
  password: string;
  phone_number?: string;
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
      const response = await apiClient.get(`/profiles?role=${role}`);
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
  ): Promise<PaginatedResponse<Profile>> {
    try {
      const response = await apiClient.get<PaginatedResponse<Profile>>(
        `/profiles?role=${role}&page=${page}&limit=${limit}`,
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
    return await apiClient.get(`/profiles/${id}`);
  },

  async createProfile(data: CreateUserInput): Promise<Profile> {
    return await apiClient.post('/profiles', data);
  },

  async updateProfile(id: string, data: UpdateUserInput): Promise<Profile> {
    return await apiClient.put(`/profiles/${id}`, data);
  },

  async adminUpdateProfile(
    id: string,
    data: AdminUpdateUserInput,
  ): Promise<Profile> {
    return await apiClient.put(`/profiles/${id}`, data);
  },

  async deleteProfile(id: string): Promise<{ message: string }> {
    return await apiClient.delete(`/profiles/${id}`);
  },
};

export default userService;
