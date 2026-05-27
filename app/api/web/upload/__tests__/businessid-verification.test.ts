import { describe, it, expect, vi } from 'vitest';
import type { Mock } from 'vitest';
import type { NextRequest } from 'next/server';

vi.mock('@/lib/api/verifyBusinessOwner', () => ({
  verifyBusinessOwner: vi.fn(),
}));

import { POST as uploadVerification } from '@/app/api/upload/verification-docs/route';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';

describe('POST /api/upload/verification-docs businessId verification', () => {
  it('rejects when client supplies a businessId the caller does not own', async () => {
    const mockVerify = verifyBusinessOwner as unknown as Mock;

    // First call: initial session-based verification (returns user's business b1)
    mockVerify.mockResolvedValueOnce({
      authorized: true,
      user: { id: 'user-1' },
      business: { id: 'b1' },
    });

    // Second call: verification of supplied businessId b2 -> forbidden
    mockVerify.mockResolvedValueOnce({
      authorized: false,
      error: { code: 'FORBIDDEN', message: 'You do not have permission' },
    });

    const mockReq = {
      formData: async () => ({
        get: (k: string) => {
          if (k === 'file')
            return { size: 1, type: 'application/pdf', name: 'a.pdf' };
          if (k === 'businessId') return 'b2';
          return null;
        },
      }),
    } as unknown as NextRequest;

    const res = await uploadVerification(mockReq);
    const body = await res.json();

    expect(body.success).toBe(false);
    expect(res.status).toBe(403);
  });
});
