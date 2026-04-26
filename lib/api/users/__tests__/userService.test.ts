import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  mapProfileToUser,
  fetchProfileById,
  updateUserProfile,
  PROFILE_SELECT_FIELDS,
} from '@/lib/api/users/userService';
import * as supabaseServer from '@/supabase/server';
import { User } from '@/lib/types';

// Mock supabase server
vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

describe('userService', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      from: vi.fn(),
    };

    vi.mocked(supabaseServer.createServerSupabaseClient).mockResolvedValue(
      mockSupabase,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('mapProfileToUser()', () => {
    it('should map profile object to User type', () => {
      const profile = {
        id: 'user-123',
        email: 'test@example.com',
        full_name: 'Test User',
        phone_number: '+1234567890',
        role: 'app_user',
        avatar_url: 'https://example.com/avatar.jpg',
        status: 'active',
        archived_at: null,
      };

      const result = mapProfileToUser(profile);

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        full_name: 'Test User',
        phone_number: '+1234567890',
        role: 'app_user',
        avatar_url: 'https://example.com/avatar.jpg',
      });
    });

    it('should handle null phone_number and avatar_url', () => {
      const profile = {
        id: 'user-123',
        email: 'test@example.com',
        full_name: 'Test User',
        phone_number: null,
        role: 'admin',
        avatar_url: null,
        status: 'active',
        archived_at: null,
      };

      const result = mapProfileToUser(profile);

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        full_name: 'Test User',
        phone_number: null,
        role: 'admin',
        avatar_url: null,
      });
    });

    it('should handle all role types', () => {
      const roles: Array<'admin' | 'business_owner' | 'app_user'> = [
        'admin',
        'business_owner',
        'app_user',
      ];

      roles.forEach((role) => {
        const profile = {
          id: 'user-123',
          email: 'test@example.com',
          full_name: 'Test User',
          phone_number: '+1234567890',
          role,
          avatar_url: 'https://example.com/avatar.jpg',
          status: 'active',
          archived_at: null,
        };

        const result = mapProfileToUser(profile);

        expect(result.role).toBe(role);
      });
    });
  });

  describe('fetchProfileById()', () => {
    it('should fetch and map profile by user ID', async () => {
      const userId = 'user-123';
      const profile = {
        id: userId,
        email: 'test@example.com',
        full_name: 'Test User',
        phone_number: '+1234567890',
        role: 'app_user',
        avatar_url: 'https://example.com/avatar.jpg',
        status: 'active',
        archived_at: null,
      };

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

      const result = await fetchProfileById(userId);

      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(mockSelect).toHaveBeenCalledWith(PROFILE_SELECT_FIELDS);
      expect(mockEq).toHaveBeenCalledWith('id', userId);
      expect(mockSingle).toHaveBeenCalled();
      expect(result).toEqual({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        phone_number: profile.phone_number,
        role: profile.role,
        avatar_url: profile.avatar_url,
      });
    });

    it('should throw error when profile not found', async () => {
      const userId = 'user-123';

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

      await expect(fetchProfileById(userId)).rejects.toThrow(
        'Failed to fetch profile',
      );
    });

    it('should throw error when database query fails', async () => {
      const userId = 'user-123';
      const dbError = new Error('Database connection failed');

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: dbError,
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

      await expect(fetchProfileById(userId)).rejects.toThrow(
        'Failed to fetch profile',
      );
    });
  });

  describe('updateUserProfile()', () => {
    it('should update full_name only', async () => {
      const userId = 'user-123';
      const updateData = { full_name: 'Updated Name' };

      const profile = {
        id: userId,
        email: 'test@example.com',
        full_name: 'Updated Name',
        phone_number: '+1234567890',
        role: 'app_user',
        avatar_url: 'https://example.com/avatar.jpg',
        status: 'active',
        archived_at: null,
      };

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockUpdate = vi.fn().mockReturnThis();
      const mockUpdateEq = vi.fn().mockResolvedValue({
        error: null,
      });
      const mockSingle = vi.fn().mockResolvedValue({
        data: profile,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      mockUpdate.mockReturnValue({
        eq: mockUpdateEq,
      });

      const result = await updateUserProfile(userId, updateData);

      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(result.full_name).toBe('Updated Name');
    });

    it('should update phone_number only', async () => {
      const userId = 'user-123';
      const updateData = { phone_number: '+9876543210' };

      const profile = {
        id: userId,
        email: 'test@example.com',
        full_name: 'Test User',
        phone_number: '+9876543210',
        role: 'app_user',
        avatar_url: 'https://example.com/avatar.jpg',
        status: 'active',
        archived_at: null,
      };

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockUpdate = vi.fn().mockReturnThis();
      const mockUpdateEq = vi.fn().mockResolvedValue({
        error: null,
      });
      const mockSingle = vi.fn().mockResolvedValue({
        data: profile,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      mockUpdate.mockReturnValue({
        eq: mockUpdateEq,
      });

      const result = await updateUserProfile(userId, updateData);

      expect(result.phone_number).toBe('+9876543210');
    });

    it('should update avatar_url only', async () => {
      const userId = 'user-123';
      const newAvatarUrl = 'https://example.com/new-avatar.jpg';
      const updateData = { avatar_url: newAvatarUrl };

      const profile = {
        id: userId,
        email: 'test@example.com',
        full_name: 'Test User',
        phone_number: '+1234567890',
        role: 'app_user',
        avatar_url: newAvatarUrl,
        status: 'active',
        archived_at: null,
      };

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockUpdate = vi.fn().mockReturnThis();
      const mockUpdateEq = vi.fn().mockResolvedValue({
        error: null,
      });
      const mockSingle = vi.fn().mockResolvedValue({
        data: profile,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      mockUpdate.mockReturnValue({
        eq: mockUpdateEq,
      });

      const result = await updateUserProfile(userId, updateData);

      expect(result.avatar_url).toBe(newAvatarUrl);
    });

    it('should update multiple fields', async () => {
      const userId = 'user-123';
      const updateData = {
        full_name: 'Updated Name',
        phone_number: '+9876543210',
        avatar_url: 'https://example.com/new-avatar.jpg',
      };

      const profile = {
        id: userId,
        email: 'test@example.com',
        full_name: 'Updated Name',
        phone_number: '+9876543210',
        role: 'app_user',
        avatar_url: 'https://example.com/new-avatar.jpg',
        status: 'active',
        archived_at: null,
      };

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockUpdate = vi.fn().mockReturnThis();
      const mockUpdateEq = vi.fn().mockResolvedValue({
        error: null,
      });
      const mockSingle = vi.fn().mockResolvedValue({
        data: profile,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      mockUpdate.mockReturnValue({
        eq: mockUpdateEq,
      });

      const result = await updateUserProfile(userId, updateData);

      expect(result.full_name).toBe('Updated Name');
      expect(result.phone_number).toBe('+9876543210');
      expect(result.avatar_url).toBe('https://example.com/new-avatar.jpg');
    });

    it('should handle null values for clear phone_number', async () => {
      const userId = 'user-123';
      const updateData = { phone_number: null };

      const profile = {
        id: userId,
        email: 'test@example.com',
        full_name: 'Test User',
        phone_number: null,
        role: 'app_user',
        avatar_url: 'https://example.com/avatar.jpg',
        status: 'active',
        archived_at: null,
      };

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockUpdate = vi.fn().mockReturnThis();
      const mockUpdateEq = vi.fn().mockResolvedValue({
        error: null,
      });
      const mockSingle = vi.fn().mockResolvedValue({
        data: profile,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      mockUpdate.mockReturnValue({
        eq: mockUpdateEq,
      });

      const result = await updateUserProfile(userId, updateData);

      expect(result.phone_number).toBeNull();
    });

    it('should throw error when update fails', async () => {
      const userId = 'user-123';
      const updateData = { full_name: 'Updated Name' };

      const mockUpdate = vi.fn().mockReturnThis();
      const mockUpdateEq = vi.fn().mockResolvedValue({
        error: new Error('Update failed'),
      });

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      });
      mockUpdate.mockReturnValue({
        eq: mockUpdateEq,
      });

      await expect(updateUserProfile(userId, updateData)).rejects.toThrow(
        'Failed to update profile',
      );
    });

    it('should throw error when fetching updated profile fails', async () => {
      const userId = 'user-123';
      const updateData = { full_name: 'Updated Name' };

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockUpdate = vi.fn().mockReturnThis();
      const mockUpdateEq = vi.fn().mockResolvedValue({
        error: null,
      });
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Fetch failed'),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      mockUpdate.mockReturnValue({
        eq: mockUpdateEq,
      });

      await expect(updateUserProfile(userId, updateData)).rejects.toThrow(
        'Failed to fetch updated profile',
      );
    });
  });

  describe('PROFILE_SELECT_FIELDS constant', () => {
    it('should be a defined string', () => {
      expect(typeof PROFILE_SELECT_FIELDS).toBe('string');
      expect(PROFILE_SELECT_FIELDS.length).toBeGreaterThan(0);
    });

    it('should include required fields', () => {
      const requiredFields = [
        'id',
        'email',
        'full_name',
        'phone_number',
        'role',
        'avatar_url',
        'status',
      ];
      requiredFields.forEach((field) => {
        expect(PROFILE_SELECT_FIELDS).toContain(field);
      });
    });
  });
});
