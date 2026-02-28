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
    return await apiClient.post('/auth/signup', {
      email: data.email,
      password: data.password,
      name: data.name,
      role: data.role,
    });
  },

  async login(data: LoginInput): Promise<AuthResponse> {
    return await apiClient.post('/auth/login', {
      email: data.email,
      password: data.password,
    });
  },

  async logout(): Promise<LogoutResponse> {
    return await apiClient.post('/auth/logout');
  },

  async verifySession(): Promise<{ user: User | null }> {
    try {
      return await apiClient.get('/auth/verify');
    } catch {
      return { user: null };
    }
  },
};

export default authService;
