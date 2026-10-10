import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import type { NextRequest } from 'next/server';

vi.mock('@/lib/api/verifyBusinessOwner', () => ({
  verifyBusinessOwner: vi.fn(),
}));
// The session check runs before the body is read; a signed-in owner.
vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
  }),
}));

import { POST as uploadVerification } from '@/app/api/web/upload/verification-docs/route';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';

const OWN_SHOP = '11111111-1111-4111-8111-111111111111';
const OTHER_SHOP = '22222222-2222-4222-8222-222222222222';

function request(businessId: string | null) {
  return {
    formData: async () => ({
      get: (k: string) => {
        if (k === 'file')
          return { size: 1, type: 'application/pdf', name: 'a.pdf' };
        if (k === 'businessId') return businessId;
        return null;
      },
    }),
  } as unknown as NextRequest;
}

describe('POST /api/web/upload/verification-docs businessId verification', () => {
  const mockVerify = verifyBusinessOwner as unknown as Mock;
  beforeEach(() => mockVerify.mockReset());

  it('rejects a businessId the caller does not own', async () => {
    mockVerify.mockResolvedValueOnce({
      authorized: false,
      error: { code: 'FORBIDDEN', message: 'You do not have permission' },
    });

    const res = await uploadVerification(request(OTHER_SHOP));

    expect(res.status).toBe(403);
    expect((await res.json()).success).toBe(false);
    expect(mockVerify).toHaveBeenCalledWith(OTHER_SHOP);
  });

  it('requires a businessId instead of guessing the caller’s shop', async () => {
    // The old fallback uploaded to `.limit(1)`'s pick of the owner's shops.
    const res = await uploadVerification(request(null));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Business ID is required');
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it('verifies exactly the shop the upload is for', async () => {
    mockVerify.mockResolvedValueOnce({
      authorized: false,
      error: { code: 'FORBIDDEN', message: 'stop here' },
    });

    await uploadVerification(request(OWN_SHOP));

    expect(mockVerify).toHaveBeenCalledTimes(1);
    expect(mockVerify).toHaveBeenCalledWith(OWN_SHOP);
  });
});
