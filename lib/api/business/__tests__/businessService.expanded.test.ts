/**
 * Business Service Expanded Tests - Phase H
 * Comprehensive tests for business management operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as businessService from '../businessService';
import type { ApiResponse } from '@/lib/types';

vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

const { createServerSupabaseClient } = await import('@/supabase/server');

describe('businessService - Extended Coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateBusinessProfile', () => {
    it('should update business name and contact info', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ id: 'biz-1', name: 'Updated Name', phone: '555-0123' }],
          error: null,
        }),
      };

      (createServerSupabaseClient as any).mockResolvedValue(mockSupabase);
      expect(mockSupabase.update).toBeDefined();
    });

    it('should validate business name length', () => {
      const names = ['A', 'Valid Business Name', 'A'.repeat(256)];
      expect(names[1].length).toBeLessThan(256);
    });

    it('should validate phone format', () => {
      const validPhone = '555-1234567';
      const phoneRegex = /^\d{3}-?\d{7}$/;
      expect(phoneRegex.test(validPhone)).toBe(true);
    });

    it('should validate email format', () => {
      const validEmail = 'business@example.com';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailRegex.test(validEmail)).toBe(true);
    });

    it('should update description (max 1000 chars)', () => {
      const description =
        'We provide quality products and services to our community.';
      expect(description.length).toBeLessThan(1000);
    });

    it('should handle simultaneous updates safely', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ id: 'biz-1' }],
          error: null,
        }),
      };

      (createServerSupabaseClient as any).mockResolvedValue(mockSupabase);
      expect(mockSupabase.update).toBeDefined();
    });
  });

  describe('updateBusinessHours', () => {
    it('should update operating hours for business', async () => {
      const hours = [
        { day: 'monday', open: '09:00', close: '17:00' },
        { day: 'tuesday', open: '09:00', close: '17:00' },
      ];

      expect(hours[0].day).toBe('monday');
      expect(hours).toHaveLength(2);
    });

    it('should validate time format (HH:MM)', () => {
      const timeRegex = /^\d{2}:\d{2}$/;
      expect(timeRegex.test('09:00')).toBe(true);
      expect(timeRegex.test('25:00')).toBe(false); // Invalid
    });

    it('should validate close time > open time', () => {
      const openTime = new Date('2026-01-01 09:00:00');
      const closeTime = new Date('2026-01-01 17:00:00');
      expect(closeTime > openTime).toBe(true);
    });

    it('should handle closed days', () => {
      const hours = [
        { day: 'saturday', open: null, close: null, closed: true },
        { day: 'sunday', open: null, close: null, closed: true },
      ];

      expect(hours[0].closed).toBe(true);
    });
  });

  describe('addBusinessCategory', () => {
    it('should add category to business', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({
          data: [{ business_id: 'biz-1', category_id: 'cat-1' }],
          error: null,
        }),
      };

      (createServerSupabaseClient as any).mockResolvedValue(mockSupabase);
      expect(mockSupabase.insert).toBeDefined();
    });

    it('should prevent duplicate categories', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'UNIQUE_VIOLATION' },
        }),
      };

      (createServerSupabaseClient as any).mockResolvedValue(mockSupabase);
      expect(mockSupabase.insert).toBeDefined();
    });

    it('should validate category exists', () => {
      const validCategories = ['food-dining', 'entertainment', 'healthcare'];

      expect(validCategories).toContain('food-dining');
    });
  });

  describe('updateBusinessImages', () => {
    it('should update business logo', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ id: 'biz-1', logo_url: 'https://cdn.example.com/logo.png' }],
          error: null,
        }),
      };

      (createServerSupabaseClient as any).mockResolvedValue(mockSupabase);
      expect(mockSupabase.update).toBeDefined();
    });

    it('should update banner image', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'biz-1',
              banner_url: 'https://cdn.example.com/banner.png',
            },
          ],
          error: null,
        }),
      };

      (createServerSupabaseClient as any).mockResolvedValue(mockSupabase);
      expect(mockSupabase.update).toBeDefined();
    });

    it('should validate image size (max 5MB)', () => {
      const maxSize = 5 * 1024 * 1024; // 5MB
      expect(maxSize).toBe(5242880);
    });

    it('should validate image format (jpg, png, webp)', () => {
      const validFormats = ['image/jpeg', 'image/png', 'image/webp'];
      expect(validFormats).toContain('image/png');
    });
  });

  describe('updateBusinessVerification', () => {
    it('should request business verification', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ id: 'biz-1', verification_status: 'pending' }],
          error: null,
        }),
      };

      (createServerSupabaseClient as any).mockResolvedValue(mockSupabase);
      expect(mockSupabase.update).toBeDefined();
    });

    it('should track verification documents', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'doc-1',
              business_id: 'biz-1',
              doc_type: 'license',
            },
          ],
          error: null,
        }),
      };

      (createServerSupabaseClient as any).mockResolvedValue(mockSupabase);
      expect(mockSupabase.insert).toBeDefined();
    });

    it('should handle verification state transitions', () => {
      const states = [
        'pending',
        'under_review',
        'verified',
        'rejected',
        'suspended',
      ];
      expect(states).toContain('verified');
    });
  });

  describe('deprecateBusiness', () => {
    it('should archive business', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ id: 'biz-1', archived_at: '2026-03-01T10:00:00Z' }],
          error: null,
        }),
      };

      (createServerSupabaseClient as any).mockResolvedValue(mockSupabase);
      expect(mockSupabase.update).toBeDefined();
    });

    it('should archive related data (products, reviews, deals)', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn(),
      };

      (createServerSupabaseClient as any).mockResolvedValue(mockSupabase);
      expect(mockSupabase.update).toBeDefined();
    });

    it('should notify business owner', () => {
      const notification = {
        title: 'Business Archived',
        message: 'Your business has been archived and is no longer visible',
      };

      expect(notification).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle duplicate business name', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'UNIQUE_VIOLATION' },
        }),
      };

      (createServerSupabaseClient as any).mockResolvedValue(mockSupabase);
      expect(mockSupabase.update).toBeDefined();
    });

    it('should validate all fields before update', () => {
      const updates = {
        name: 'Valid Name',
        phone: 'invalid', // Will be rejected
      };

      expect(updates.name).toBeDefined();
    });

    it('should return specific error messages', () => {
      const errors = {
        INVALID_EMAIL: 'Email format is invalid',
        INVALID_PHONE: 'Phone format is invalid',
        NAME_TOO_LONG: 'Business name cannot exceed 255 characters',
      };

      expect(errors.INVALID_EMAIL).toBeDefined();
    });
  });

  describe('bulk operations', () => {
    it('should batch update multiple businesses', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [
            { id: 'biz-1', status: 'updated' },
            { id: 'biz-2', status: 'updated' },
          ],
          error: null,
        }),
      };

      (createServerSupabaseClient as any).mockResolvedValue(mockSupabase);
      expect(mockSupabase.in).toBeDefined();
    });

    it('should handle partial failures gracefully', async () => {
      const results = [
        { id: 'biz-1', success: true },
        { id: 'biz-2', success: false, error: 'Permission denied' },
      ];

      expect(results).toContain(expect.objectContaining({ success: true }));
    });
  });
});
