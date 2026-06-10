/**
 * Business document review action tests.
 * Verifies each decision flips status (via the business service) AND emits the
 * correct notification to the owner, plus the auth + remarks guards.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AdminBusiness } from '@/lib/types/business';
import type { User } from '@/lib/types/user';

const verifyCurrentUserIsAdmin = vi.fn();
const getCurrentUser = vi.fn();
const verifyBusiness = vi.fn();
const rejectBusiness = vi.fn();
const emitNotification = vi.fn();
const revalidatePath = vi.fn();

vi.mock('@/lib/api/admin/adminActionHelpers', () => ({
  verifyCurrentUserIsAdmin: () => verifyCurrentUserIsAdmin(),
}));
vi.mock('@/lib/api/getCurrentUser', () => ({
  getCurrentUser: () => getCurrentUser(),
}));
vi.mock('@/lib/api/business/businessService', () => ({
  verifyBusiness: (id: string, notes?: string) => verifyBusiness(id, notes),
  rejectBusiness: (id: string, reason?: string) => rejectBusiness(id, reason),
}));
vi.mock('@/lib/api/notifications/notificationsService', () => ({
  emitNotification: (input: unknown) => emitNotification(input),
}));
vi.mock('next/cache', () => ({
  revalidatePath: (p: string, t?: string) => revalidatePath(p, t),
}));
vi.mock('@/supabase/server', () => ({
  createServerAdminClient: vi.fn(),
}));

import {
  approveBusinessDocumentsAction,
  rejectBusinessDocumentsAction,
} from '../businessReviewActions';

const BUSINESS_ID = '33333333-3333-4333-8333-333333333333';
const OWNER_ID = '44444444-4444-4444-8444-444444444444';

const admin: User = {
  id: '55555555-5555-4555-8555-555555555555',
  email: 'admin@example.com',
  full_name: 'Admin',
  phone_number: null,
  role: 'admin',
  avatar_url: null,
};

const business = {
  id: BUSINESS_ID,
  owner_id: OWNER_ID,
  shop_name: 'Test Cafe',
  status: 'verified',
} as unknown as AdminBusiness;

beforeEach(() => {
  vi.clearAllMocks();
  verifyCurrentUserIsAdmin.mockResolvedValue({ authorized: true });
  getCurrentUser.mockResolvedValue(admin);
  verifyBusiness.mockResolvedValue({ success: true, data: business });
  rejectBusiness.mockResolvedValue({
    success: true,
    data: { ...business, status: 'rejected' },
  });
  emitNotification.mockResolvedValue({ success: true, data: { id: 'n1' } });
});

describe('approveBusinessDocumentsAction', () => {
  it('verifies the business and notifies the owner (approved)', async () => {
    const result = await approveBusinessDocumentsAction(BUSINESS_ID);

    expect(result.success).toBe(true);
    expect(verifyBusiness).toHaveBeenCalledWith(BUSINESS_ID, undefined);
    expect(emitNotification).toHaveBeenCalledTimes(1);
    const payload = emitNotification.mock.calls[0][0];
    expect(payload).toMatchObject({
      user_id: OWNER_ID,
      type: 'business_document_approved',
      business_id: BUSINESS_ID,
      actor_id: admin.id,
    });
    expect(revalidatePath).toHaveBeenCalledWith('/admin', 'layout');
  });

  it('carries optional remarks into the notification metadata', async () => {
    await approveBusinessDocumentsAction(BUSINESS_ID, 'all good');
    expect(verifyBusiness).toHaveBeenCalledWith(BUSINESS_ID, 'all good');
    expect(emitNotification.mock.calls[0][0]).toMatchObject({
      metadata: { remarks: 'all good' },
    });
  });
});

describe('rejectBusinessDocumentsAction', () => {
  it('rejects the business and notifies with remarks (disapproved)', async () => {
    const result = await rejectBusinessDocumentsAction(
      BUSINESS_ID,
      'tax certificate expired',
    );

    expect(result.success).toBe(true);
    expect(rejectBusiness).toHaveBeenCalledWith(
      BUSINESS_ID,
      'tax certificate expired',
    );
    expect(emitNotification.mock.calls[0][0]).toMatchObject({
      user_id: OWNER_ID,
      type: 'business_document_rejected',
      metadata: { remarks: 'tax certificate expired' },
    });
  });

  it('requires remarks — empty remarks is rejected before any mutation', async () => {
    const result = await rejectBusinessDocumentsAction(BUSINESS_ID, '   ');

    expect(result.success).toBe(false);
    expect(rejectBusiness).not.toHaveBeenCalled();
    expect(emitNotification).not.toHaveBeenCalled();
  });
});

describe('authorization', () => {
  it('blocks non-admins and performs no mutation', async () => {
    verifyCurrentUserIsAdmin.mockResolvedValue({
      authorized: false,
      error: 'Only admins can perform this action',
    });

    const result = await approveBusinessDocumentsAction(BUSINESS_ID);

    expect(result.success).toBe(false);
    expect(verifyBusiness).not.toHaveBeenCalled();
    expect(emitNotification).not.toHaveBeenCalled();
  });

  it('rejects an invalid business id', async () => {
    const result = await approveBusinessDocumentsAction('not-a-uuid');
    expect(result.success).toBe(false);
    expect(verifyBusiness).not.toHaveBeenCalled();
  });
});
