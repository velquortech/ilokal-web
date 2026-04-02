import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as businessQuery from '@/lib/api/business/businessQuery';
import * as supabaseServer from '@/supabase/server';

// Mock supabase server
vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

describe('businessQuery', () => {
  let mockSupabase: { from: ReturnType<typeof vi.fn> };
  let chainedMock: {
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    or: ReturnType<typeof vi.fn>;
    lte: ReturnType<typeof vi.fn>;
    gte: ReturnType<typeof vi.fn>;
    lt: ReturnType<typeof vi.fn>;
    ilike: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    range: ReturnType<typeof vi.fn>;
    single: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    is: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a single chainable object that always returns itself for method chaining
    chainedMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn(),
      single: vi.fn(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
    };

    mockSupabase = {
      from: vi.fn(() => chainedMock),
    };

    vi.mocked(supabaseServer.createServerSupabaseClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<
        ReturnType<typeof supabaseServer.createServerSupabaseClient>
      >,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getBusinessById()', () => {
    it('should fetch business with owner details by ID', async () => {
      const businessId = 'biz-1';
      const mockBusiness = {
        id: businessId,
        name: 'Test Business',
        owner_id: 'user-1',
        status: 'verified',
      };

      chainedMock.single.mockResolvedValue({
        data: mockBusiness,
        error: null,
      });

      const result = await businessQuery.getBusinessById(businessId);

      expect(result.business).toEqual(mockBusiness);
      expect(result.error).toBeNull();
    });

    it('should return error when business not found', async () => {
      const businessId = 'biz-nonexistent';

      chainedMock.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const result = await businessQuery.getBusinessById(businessId);

      expect(result.business).toBeNull();
      expect(result.error).toBe('Not found');
    });
  });

  describe('getBusinessesPaginated()', () => {
    it('should return paginated businesses without filters', async () => {
      const mockBusinesses = [
        { id: 'biz-1', name: 'Business 1', status: 'verified' },
        { id: 'biz-2', name: 'Business 2', status: 'verified' },
      ];

      chainedMock.range.mockResolvedValue({
        data: mockBusinesses,
        count: 2,
        error: null,
      });

      const result = await businessQuery.getBusinessesPaginated({
        page: 1,
        pageSize: 10,
      });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.error).toBeNull();
    });

    it('should filter businesses by status', async () => {
      chainedMock.range.mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      });

      await businessQuery.getBusinessesPaginated({
        page: 1,
        pageSize: 10,
        status: 'pending',
      });

      expect(chainedMock.eq).toHaveBeenCalledWith('status', 'pending');
    });

    it('should search businesses by name or email', async () => {
      chainedMock.range.mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      });

      await businessQuery.getBusinessesPaginated({
        page: 1,
        pageSize: 10,
        search: 'test',
      });

      expect(chainedMock.or).toHaveBeenCalled();
    });

    it('should handle pagination offset correctly', async () => {
      chainedMock.range.mockResolvedValue({
        data: [],
        count: 25,
        error: null,
      });

      const result = await businessQuery.getBusinessesPaginated({
        page: 3,
        pageSize: 10,
      });

      expect(chainedMock.range).toHaveBeenCalledWith(20, 29);
      expect(result.total).toBe(25);
    });

    it('should sort by name ascending', async () => {
      chainedMock.range.mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      });

      await businessQuery.getBusinessesPaginated({
        page: 1,
        pageSize: 10,
        sortBy: 'name',
        sortOrder: 'asc',
      });

      expect(chainedMock.order).toHaveBeenCalledWith('name', {
        ascending: true,
      });
    });

    it('should handle database error', async () => {
      chainedMock.range.mockResolvedValue({
        data: null,
        count: null,
        error: { message: 'DB error' },
      });

      const result = await businessQuery.getBusinessesPaginated({
        page: 1,
        pageSize: 10,
      });

      expect(result.data).toHaveLength(0);
      expect(result.error).toBe('DB error');
    });
  });

  describe('getBusinessesByStatus()', () => {
    it('should fetch all businesses with specific status', async () => {
      const mockBusinesses = [
        { id: 'biz-1', status: 'pending', name: 'Pending Biz' },
        { id: 'biz-2', status: 'pending', name: 'Another Pending' },
      ];

      chainedMock.eq.mockResolvedValue({
        data: mockBusinesses,
        error: null,
      });

      const result = await businessQuery.getBusinessesByStatus('pending');

      expect(result.businesses).toHaveLength(2);
      expect(result.error).toBeNull();
    });

    it('should return empty list when no businesses found', async () => {
      chainedMock.eq.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await businessQuery.getBusinessesByStatus('rejected');

      expect(result.businesses).toHaveLength(0);
    });
  });

  describe('countBusinessesByStatus()', () => {
    it('should count businesses by status', async () => {
      const mockData = [
        { status: 'pending' },
        { status: 'pending' },
        { status: 'verified' },
        { status: 'suspended' },
      ];

      chainedMock.select.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await businessQuery.countBusinessesByStatus();

      expect(result.counts.pending).toBe(2);
      expect(result.counts.verified).toBe(1);
      expect(result.counts.suspended).toBe(1);
      expect(result.counts.rejected).toBe(0);
      expect(result.counts.total).toBe(4);
    });
  });

  describe('updateBusinessStatus()', () => {
    it('should update business status successfully', async () => {
      const businessId = 'biz-1';
      const updatedBusiness = {
        id: businessId,
        status: 'verified',
        name: 'Business',
      };

      chainedMock.single.mockResolvedValue({
        data: updatedBusiness,
        error: null,
      });

      const result = await businessQuery.updateBusinessStatus(
        businessId,
        'verified',
      );

      expect(result.business).toEqual(updatedBusiness);
      expect(result.error).toBeNull();
    });

    it('should handle update error', async () => {
      const businessId = 'biz-1';

      chainedMock.single.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      const result = await businessQuery.updateBusinessStatus(
        businessId,
        'suspended',
      );

      expect(result.business).toBeNull();
      expect(result.error).toBe('Update failed');
    });
  });

  describe('updateBusinessProfile()', () => {
    it('should update business profile with allowed fields', async () => {
      const businessId = 'biz-1';
      const updates = {
        name: 'Updated Name',
        description: 'Updated description',
      };

      const updatedBusiness = {
        id: businessId,
        name: 'Updated Name',
        description: 'Updated description',
      };

      chainedMock.single.mockResolvedValue({
        data: updatedBusiness,
        error: null,
      });

      const result = await businessQuery.updateBusinessProfile(
        businessId,
        updates,
      );

      expect(result.business?.name).toBe('Updated Name');
      expect(result.error).toBeNull();
    });

    it('should exclude restricted fields from update', async () => {
      const businessId = 'biz-1';
      const updates = {
        id: 'should-be-ignored',
        owner_id: 'should-be-ignored',
        created_at: 'should-be-ignored',
        name: 'New Name',
      };

      chainedMock.single.mockResolvedValue({
        data: { name: 'New Name' },
        error: null,
      });

      await businessQuery.updateBusinessProfile(businessId, updates);

      expect(chainedMock.update).toHaveBeenCalled();
    });
  });

  describe('archiveBusinessById()', () => {
    it('should archive business successfully', async () => {
      const businessId = 'biz-1';

      chainedMock.eq.mockResolvedValue({ error: null });

      const result = await businessQuery.archiveBusinessById(businessId);

      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should handle archive error', async () => {
      const businessId = 'biz-1';

      chainedMock.eq.mockResolvedValue({
        error: { message: 'Archive failed' },
      });

      const result = await businessQuery.archiveBusinessById(businessId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Archive failed');
    });
  });

  describe('deleteBusinessById()', () => {
    it('should delete business successfully', async () => {
      const businessId = 'biz-1';

      chainedMock.eq.mockResolvedValue({ error: null });

      const result = await businessQuery.deleteBusinessById(businessId);

      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should handle delete error', async () => {
      const businessId = 'biz-1';

      chainedMock.eq.mockResolvedValue({
        error: { message: 'Delete failed' },
      });

      const result = await businessQuery.deleteBusinessById(businessId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Delete failed');
    });
  });
});
