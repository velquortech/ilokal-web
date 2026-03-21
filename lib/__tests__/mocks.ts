/**
 * Test helpers and mocks for Supabase client
 */

import { vi } from 'vitest';

/**
 * Create a mock Supabase client for testing
 */
export const createMockSupabaseClient = () => {
  const mockSelect = vi.fn().mockReturnThis();
  const mockEq = vi.fn().mockReturnThis();
  const mockIs = vi.fn().mockReturnThis();
  const mockSingle = vi.fn();
  const mockInsert = vi.fn().mockReturnThis();
  const mockUpdate = vi.fn().mockReturnThis();
  const mockDelete = vi.fn().mockReturnThis();
  const mockFrom = vi.fn().mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  });

  return {
    from: mockFrom,
    mockSelect,
    mockEq,
    mockIs,
    mockSingle,
    mockInsert,
    mockUpdate,
    mockDelete,
  };
};

/**
 * Mock Supabase response
 */
export const createMockSuccessResponse = <T>(data: T) => ({
  data,
  error: null,
});

export const createMockErrorResponse = (code: string, message: string) => ({
  data: null,
  error: { code, message },
});

/**
 * Create mock subscription data
 */
export const mockSubscriptionData = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  business_id: '550e8400-e29b-41d4-a716-446655440001',
  plan_id: '550e8400-e29b-41d4-a716-446655440002',
  status: 'active' as const,
  auto_renew: true,
  cycle_start_date: '2026-03-01T00:00:00Z',
  cycle_end_date: '2026-04-01T00:00:00Z',
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
  archived_at: null,
};

/**
 * Create mock payment data
 */
export const mockPaymentData = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  business_id: '550e8400-e29b-41d4-a716-446655440001',
  amount: 10000,
  currency: 'PHP' as const,
  status: 'succeeded' as const,
  payment_method: 'card' as const,
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
  archived_at: null,
};

/**
 * Create mock subscription plan data
 */
export const mockSubscriptionPlanData = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Premium',
  description: 'Premium plan',
  price: 50000,
  currency: 'PHP' as const,
  billing_cycle: 'monthly' as const,
  features: ['Feature 1', 'Feature 2'],
  display_order: 2,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  archived_at: null,
};

/**
 * Create mock invoice data
 */
export const mockInvoiceData = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  payment_id: '550e8400-e29b-41d4-a716-446655440001',
  user_id: '550e8400-e29b-41d4-a716-446655440002',
  business_id: '550e8400-e29b-41d4-a716-446655440003',
  amount: 10000,
  currency: 'PHP' as const,
  status: 'sent' as const,
  invoice_number: 'INV-20260321-00001',
  due_date: '2026-04-21',
  email_sent_at: '2026-03-21T10:00:00Z',
  paid_at: null,
  created_at: '2026-03-21T00:00:00Z',
  updated_at: '2026-03-21T00:00:00Z',
  archived_at: null,
};

/**
 * Create mock API response helper
 */
export function createMockApiResponse<T>(
  success: boolean,
  data?: T,
  error?: { code: string; message: string },
) {
  return {
    success,
    data,
    error,
  };
}
