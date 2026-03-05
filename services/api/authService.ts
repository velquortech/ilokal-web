import apiClient from './apiClient';
import { LoginInput, SignupInput } from '@/app/admin/schemas/validation/auth';
import { User } from '@/lib/types/user';

export interface AuthResponse {
  user: User;
  message: string;
}

export interface LogoutResponse {
  message: string;
}

const authService = {
  async signup(data: SignupInput): Promise<AuthResponse> {
    const phoneNumber = data.phone_number?.trim();
    const hasPhoneNumber = phoneNumber && /\d/.test(phoneNumber);

    return await apiClient.post('/auth/signup', {
      email: data.email,
      password: data.password,
      name: data.name,
      role: data.role,
      ...(hasPhoneNumber && { phone_number: phoneNumber }),
      ...(data.avatar_url && { avatar_url: data.avatar_url }),
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
