import apiClient from './apiClient';
import { LoginInput, SignupInput } from '@/lib/validation/auth';
import { User } from '@/lib/stores/authStore';

export interface AuthResponse {
  user: User;
  message: string;
}

export interface LogoutResponse {
  message: string;
}

const authService = {
  async signup(data: SignupInput): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/signup', {
      email: data.email,
      password: data.password,
      name: data.name,
    });
    return response;
  },

  async login(data: LoginInput): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', {
      email: data.email,
      password: data.password,
    });
    return response;
  },

  async logout(): Promise<LogoutResponse> {
    const response = await apiClient.post<LogoutResponse>('/auth/logout');
    return response;
  },

  async verifySession(): Promise<{ user: User | null }> {
    try {
      const response = await apiClient.get<{ user: User | null }>(
        '/auth/verify',
      );
      return response;
    } catch {
      return { user: null };
    }
  },
};

export default authService;
