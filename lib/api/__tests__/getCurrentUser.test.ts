import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { redirect } from 'next/navigation';
import {
  getCurrentUser,
  getAdminUserOrRedirect,
  getBusinessUserOrRedirect,
} from '@/lib/api/getCurrentUser';
import * as supabaseServer from '@/supabase/server';
import { ROUTES } from '@/config/routeConfig';
import { User } from '@/lib/types/user';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

// Mock supabase server
vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

describe('getCurrentUser', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
    };

    vi.mocked(supabaseServer.createServerSupabaseClient).mockResolvedValue(
      mockSupabase,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getCurrentUser()', () => {
    it('should return null when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      const result = await getCurrentUser();

      expect(result).toBeNull();
    });

    it('should return null when profile is not found', async () => {
      const authUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: authUser },
      });

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const result = await getCurrentUser();

      expect(result).toBeNull();
    });

    it('should return user when authenticated and profile exists', async () => {
      const authUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      const profile = {
        id: 'user-123',
        email: 'test@example.com',
        full_name: 'Test User',
        phone_number: '+1234567890',
        role: 'app_user',
        avatar_url: 'https://example.com/avatar.jpg',
        status: 'active',
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: authUser },
      });

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: profile,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const result = await getCurrentUser();

      expect(result).toEqual({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        phone_number: profile.phone_number,
        role: profile.role,
        avatar_url: profile.avatar_url,
      });
    });

    it('should return null and log error when database query fails', async () => {
      const authUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: authUser },
      });

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockRejectedValue(new Error('Database error'));

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const result = await getCurrentUser();

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        '[getCurrentUser] Error:',
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getAdminUserOrRedirect()', () => {
    it('should redirect to login when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      vi.mocked(redirect).mockImplementation(() => {
        throw new Error('Redirected to login');
      });

      try {
        await getAdminUserOrRedirect();
      } catch (error) {
        // Expected redirect
      }

      expect(redirect).toHaveBeenCalledWith(ROUTES.AUTH.LOGIN);
    });

    it('should redirect to login when profile is not found', async () => {
      const authUser = { id: 'user-123' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: authUser },
      });

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      vi.mocked(redirect).mockImplementation(() => {
        throw new Error('Redirected to login');
      });

      try {
        await getAdminUserOrRedirect();
      } catch (error) {
        // Expected redirect
      }

      expect(redirect).toHaveBeenCalledWith(ROUTES.AUTH.LOGIN);
    });

    it('should redirect to home when user is not admin', async () => {
      const authUser = { id: 'user-123' };

      const profile = {
        id: 'user-123',
        email: 'test@example.com',
        full_name: 'Test User',
        phone_number: '+1234567890',
        role: 'app_user',
        avatar_url: 'https://example.com/avatar.jpg',
        status: 'active',
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: authUser },
      });

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: profile,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      vi.mocked(redirect).mockImplementation(() => {
        throw new Error('Redirected to home');
      });

      try {
        await getAdminUserOrRedirect();
      } catch (error) {
        // Expected redirect
      }

      expect(redirect).toHaveBeenCalledWith(ROUTES.DASHBOARD.HOME);
    });

    it('should redirect to login when admin account is inactive', async () => {
      const authUser = { id: 'user-123' };

      const profile = {
        id: 'user-123',
        email: 'test@example.com',
        full_name: 'Test Admin',
        phone_number: '+1234567890',
        role: 'admin',
        avatar_url: 'https://example.com/avatar.jpg',
        status: 'suspended',
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: authUser },
      });

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: profile,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      vi.mocked(redirect).mockImplementation(() => {
        throw new Error('Redirected to login');
      });

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      try {
        await getAdminUserOrRedirect();
      } catch (error) {
        // Expected redirect
      }

      expect(redirect).toHaveBeenCalledWith(ROUTES.AUTH.LOGIN);
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it('should return admin user when all validations pass', async () => {
      const authUser = { id: 'admin-123' };

      const profile = {
        id: 'admin-123',
        email: 'admin@example.com',
        full_name: 'Admin User',
        phone_number: '+1234567890',
        role: 'admin',
        avatar_url: 'https://example.com/avatar.jpg',
        status: 'active',
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: authUser },
      });

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: profile,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const result = await getAdminUserOrRedirect();

      expect(result).toEqual({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        phone_number: profile.phone_number,
        role: profile.role,
        avatar_url: profile.avatar_url,
      });

      expect(redirect).not.toHaveBeenCalled();
    });
  });

  describe('getBusinessUserOrRedirect()', () => {
    it('should redirect to login when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      vi.mocked(redirect).mockImplementation(() => {
        throw new Error('Redirected to login');
      });

      try {
        await getBusinessUserOrRedirect();
      } catch (error) {
        // Expected redirect
      }

      expect(redirect).toHaveBeenCalledWith(ROUTES.AUTH.LOGIN);
    });

    it('should redirect to home when user is not business owner', async () => {
      const authUser = { id: 'user-123' };

      const profile = {
        id: 'user-123',
        email: 'test@example.com',
        full_name: 'Test User',
        phone_number: '+1234567890',
        role: 'app_user',
        avatar_url: 'https://example.com/avatar.jpg',
        status: 'active',
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: authUser },
      });

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: profile,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      vi.mocked(redirect).mockImplementation(() => {
        throw new Error('Redirected to home');
      });

      try {
        await getBusinessUserOrRedirect();
      } catch (error) {
        // Expected redirect
      }

      expect(redirect).toHaveBeenCalledWith(ROUTES.DASHBOARD.HOME);
    });

    it('should return business user when all validations pass', async () => {
      const authUser = { id: 'business-123' };

      const profile = {
        id: 'business-123',
        email: 'business@example.com',
        full_name: 'Business Owner',
        phone_number: '+1234567890',
        role: 'business_owner',
        avatar_url: 'https://example.com/avatar.jpg',
        status: 'active',
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: authUser },
      });

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: profile,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const result = await getBusinessUserOrRedirect();

      expect(result).toEqual({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        phone_number: profile.phone_number,
        role: profile.role,
        avatar_url: profile.avatar_url,
      });

      expect(redirect).not.toHaveBeenCalled();
    });
  });
});
