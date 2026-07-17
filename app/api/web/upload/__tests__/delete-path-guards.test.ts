/**
 * SEC-7 — DELETE /api/web/upload/[bucket]/[id] path + ownership guards:
 * traversal-shaped / non-UUID paths are rejected before any storage call, and
 * the avatars bucket only lets the owner (or an admin) delete.
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { DELETE } from '../[bucket]/[id]/route';
import { assertAuthorized } from '@/lib/utils/assertAuthorized';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import { createServerSupabaseClient } from '@/supabase/server';

vi.mock('@/lib/utils/assertAuthorized', () => ({
  assertAuthorized: vi.fn(),
}));
vi.mock('@/lib/api/verifyBusinessOwner', () => ({
  verifyBusinessOwner: vi.fn(),
}));
vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

const OWNER_ID = '11111111-2222-3333-4444-555555555555';
const BUSINESS_ID = 'aaaaaaaa-0000-0000-0000-000000000001';

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost/api/web/upload/x/y', {
    method: 'DELETE',
  });
}

function params(bucket: string, id: string) {
  return { params: Promise.resolve({ bucket, id }) };
}

describe('DELETE /api/web/upload/[bucket]/[id] path guards', () => {
  const remove = vi.fn().mockResolvedValue({ error: null });

  beforeEach(() => {
    vi.clearAllMocks();
    (assertAuthorized as Mock).mockResolvedValue({
      authorized: true,
      user: { id: OWNER_ID },
      profile: { role: 'business_owner' },
    });
    (verifyBusinessOwner as Mock).mockResolvedValue({ authorized: true });
    (createServerSupabaseClient as Mock).mockResolvedValue({
      storage: { from: vi.fn().mockReturnValue({ remove }) },
    });
  });

  it('rejects a path whose first segment is not a UUID', async () => {
    const res = await DELETE(
      makeRequest(),
      params('shop-logos', encodeURIComponent('not-a-uuid/logo.webp')),
    );
    expect(res.status).toBe(400);
    expect(remove).not.toHaveBeenCalled();
  });

  it('rejects traversal-shaped paths', async () => {
    const res = await DELETE(
      makeRequest(),
      params(
        'shop-logos',
        encodeURIComponent(`${BUSINESS_ID}/../other/logo.webp`),
      ),
    );
    expect(res.status).toBe(400);
    expect(remove).not.toHaveBeenCalled();
  });

  it('deletes a well-formed business-scoped path after ownership check', async () => {
    const res = await DELETE(
      makeRequest(),
      params('shop-logos', encodeURIComponent(`${BUSINESS_ID}/logo.webp`)),
    );
    expect(res.status).toBe(200);
    expect(verifyBusinessOwner).toHaveBeenCalledWith(BUSINESS_ID);
    expect(remove).toHaveBeenCalledWith([`${BUSINESS_ID}/logo.webp`]);
  });

  it("forbids deleting another user's avatar", async () => {
    const otherUser = '99999999-8888-7777-6666-555555555555';
    const res = await DELETE(
      makeRequest(),
      params('avatars', encodeURIComponent(`${otherUser}/avatar.webp`)),
    );
    expect(res.status).toBe(403);
    expect(remove).not.toHaveBeenCalled();
  });

  it('allows deleting own avatar', async () => {
    const res = await DELETE(
      makeRequest(),
      params('avatars', encodeURIComponent(`${OWNER_ID}/avatar.webp`)),
    );
    expect(res.status).toBe(200);
    expect(remove).toHaveBeenCalledWith([`${OWNER_ID}/avatar.webp`]);
  });

  it("lets an admin delete another user's avatar", async () => {
    (assertAuthorized as Mock).mockResolvedValue({
      authorized: true,
      user: { id: OWNER_ID },
      profile: { role: 'admin' },
    });
    const otherUser = '99999999-8888-7777-6666-555555555555';
    const res = await DELETE(
      makeRequest(),
      params('avatars', encodeURIComponent(`${otherUser}/avatar.webp`)),
    );
    expect(res.status).toBe(200);
  });
});
