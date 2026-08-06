import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import { createServerSupabaseClient } from '@/supabase/server';
import { MAX_GALLERY_IMAGES } from '@/lib/validation/business';

vi.mock('@/lib/api/verifyBusinessOwner');
vi.mock('@/supabase/server', () => ({ createServerSupabaseClient: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { updateBusinessGalleryAction } from '../galleryActions';

const BUSINESS_ID = '550e8400-e29b-41d4-a716-446655440000';
const OTHER_ID = '550e8400-e29b-41d4-a716-4466554400ff';

const HOST =
  'https://proj.supabase.co/storage/v1/object/public/interior-images';

const authorized = {
  authorized: true as const,
  business: { id: BUSINESS_ID },
  // A distinct user per test run so the module-level rate limiter (30/60s)
  // cannot leak a spent budget from one case into the next.
  user: { id: `user-${Math.random()}` },
};

type Chain = Record<string, ReturnType<typeof vi.fn>>;

/**
 * `from('businesses')` is called twice — once to read the current gallery, once
 * to write the new one — so the mock hands back a fresh chain per call.
 */
function mockSupabase({
  current,
  next,
  readError = null,
  writeError = null,
}: {
  current: string[];
  next: string[];
  readError?: unknown;
  writeError?: unknown;
}) {
  const readChain: Chain = {};
  for (const m of ['select', 'eq', 'is']) {
    readChain[m] = vi.fn().mockReturnValue(readChain);
  }
  readChain.single = vi.fn().mockResolvedValue({
    data: { interior_images: current },
    error: readError,
  });

  const writeChain: Chain = {};
  for (const m of ['update', 'eq', 'select']) {
    writeChain[m] = vi.fn().mockReturnValue(writeChain);
  }
  writeChain.single = vi
    .fn()
    .mockResolvedValue({ data: { interior_images: next }, error: writeError });

  const remove = vi.fn().mockResolvedValue({ data: null, error: null });
  const from = vi
    .fn()
    .mockReturnValueOnce(readChain)
    .mockReturnValueOnce(writeChain);

  const client = {
    from,
    storage: { from: vi.fn().mockReturnValue({ remove }) },
  } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

  (createServerSupabaseClient as unknown as Mock).mockResolvedValue(client);
  return { readChain, writeChain, remove, from };
}

function mockAuthorized(business = { id: BUSINESS_ID }) {
  vi.mocked(verifyBusinessOwner).mockResolvedValue({
    ...authorized,
    business,
    user: { id: `user-${Math.random()}` },
  } as unknown as Awaited<ReturnType<typeof verifyBusinessOwner>>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthorized();
});

/**
 * Every export in a `'use server'` file is a live, publicly invocable endpoint,
 * so the boring assertions are the ones that matter: the guards run in order,
 * and the id that reaches the database is the VERIFIED one.
 */
describe('updateBusinessGalleryAction — authorization', () => {
  it.each(['', 'not-a-uuid', '../../etc'])(
    'refuses a malformed id (%j) before verifyBusinessOwner is called',
    async (id) => {
      const result = await updateBusinessGalleryAction(id, []);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      // An empty string would otherwise reach `verifyBusinessOwner`, which
      // reads a falsy id as "no argument" and authorizes whichever shop
      // `.limit(1)` returns — the wrong gallery for a two-shop owner.
      expect(verifyBusinessOwner).not.toHaveBeenCalled();
      expect(createServerSupabaseClient).not.toHaveBeenCalled();
    },
  );

  it('refuses when the caller does not own the shop', async () => {
    vi.mocked(verifyBusinessOwner).mockResolvedValue({
      authorized: false,
      error: { code: 'UNAUTHORIZED', message: 'Not authorized' },
    } as unknown as Awaited<ReturnType<typeof verifyBusinessOwner>>);

    const result = await updateBusinessGalleryAction(BUSINESS_ID, []);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('UNAUTHORIZED');
    expect(createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it('writes the VERIFIED id, not the one the caller sent', async () => {
    mockAuthorized({ id: BUSINESS_ID });
    const { writeChain } = mockSupabase({ current: [], next: [] });

    await updateBusinessGalleryAction(OTHER_ID, []);

    expect(writeChain.eq).toHaveBeenCalledWith('id', BUSINESS_ID);
    expect(writeChain.eq).not.toHaveBeenCalledWith('id', OTHER_ID);
  });

  /**
   * 🔴 The client chooses the strings that reach `storage.remove()`, and
   * `extractStoragePath` returns any non-`http` value verbatim. The bucket's
   * DELETE policy is the only other backstop, and it does NOT stop an owner who
   * holds two shops from deleting shop B's file through shop A's gallery.
   */
  it.each([
    ['another shop', `${HOST}/${OTHER_ID}/a.webp`],
    ['a raw path in another shop', `${OTHER_ID}/a.webp`],
    ['traversal out of the bucket', `${HOST}/../shop-logos/a.webp`],
    ['a nested path', `${BUSINESS_ID}/nested/a.webp`],
    ['a bare filename with no shop folder', 'a.webp'],
    ['a foreign host', 'https://evil.example/a.webp'],
  ])('refuses a path pointing at %s', async (_label, entry) => {
    const { writeChain, remove } = mockSupabase({ current: [], next: [] });

    const result = await updateBusinessGalleryAction(BUSINESS_ID, [entry]);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('VALIDATION_ERROR');
    expect(writeChain.update).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it.each(['javascript:alert(1)', 'data:text/html,<script>x</script>'])(
    'refuses the %j scheme that Zod’s url() would accept',
    async (entry) => {
      const result = await updateBusinessGalleryAction(BUSINESS_ID, [entry]);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(createServerSupabaseClient).not.toHaveBeenCalled();
    },
  );
});

describe('updateBusinessGalleryAction — the cap', () => {
  const gallery = (n: number, offset = 0) =>
    Array.from(
      { length: n },
      (_, i) => `${HOST}/${BUSINESS_ID}/p${i + offset}.webp`,
    );

  it('rejects growing past the cap', async () => {
    const { writeChain } = mockSupabase({
      current: gallery(MAX_GALLERY_IMAGES).map((u) =>
        u.replace(`${HOST}/`, ''),
      ),
      next: [],
    });

    const result = await updateBusinessGalleryAction(
      BUSINESS_ID,
      gallery(MAX_GALLERY_IMAGES + 1),
    );

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('VALIDATION_ERROR');
    expect(writeChain.update).not.toHaveBeenCalled();
  });

  /**
   * 🔴 Nothing caps the gallery at UPLOAD time — `step3Schema` requires at
   * least four interior photos and the upload route appends without a
   * ceiling — so a flat cap here would reject every write from a shop that
   * registered with eleven photos, INCLUDING the removals that would bring it
   * back under. The gallery would be permanently unmanageable.
   */
  it('still lets an over-cap gallery shrink', async () => {
    const over = gallery(MAX_GALLERY_IMAGES + 2);
    const { writeChain } = mockSupabase({
      current: over.map((u) => u.replace(`${HOST}/`, '')),
      next: [],
    });

    const result = await updateBusinessGalleryAction(
      BUSINESS_ID,
      over.slice(0, MAX_GALLERY_IMAGES + 1),
    );

    expect(result.success).toBe(true);
    expect(writeChain.update).toHaveBeenCalled();
  });
});

describe('updateBusinessGalleryAction — the narrow write', () => {
  /**
   * The whole reason this action exists. `updateBusinessProfileAction` writes
   * `description` / `logo_url` / `banner_url` / `category_id` as `?? null`
   * unconditionally, so reusing it from a gallery surface erases four columns
   * the owner never touched.
   */
  it('touches interior_images and NOTHING else', async () => {
    const { writeChain } = mockSupabase({
      current: [],
      next: [`${BUSINESS_ID}/a.webp`],
    });

    await updateBusinessGalleryAction(BUSINESS_ID, [
      `${HOST}/${BUSINESS_ID}/a.webp`,
    ]);

    const payload = writeChain.update.mock.calls[0]![0] as Record<
      string,
      unknown
    >;
    expect(Object.keys(payload)).toEqual(['interior_images']);
    for (const column of [
      'shop_name',
      'description',
      'logo_url',
      'banner_url',
      'category_id',
    ]) {
      expect(payload).not.toHaveProperty(column);
    }
  });

  it('stores bucket-relative paths, not absolute URLs', async () => {
    const { writeChain } = mockSupabase({ current: [], next: [] });

    // The client only ever sends URLs — `getBusinessGallery` resolves the row's
    // paths on the way out — and the schema requires them.
    await updateBusinessGalleryAction(BUSINESS_ID, [
      `${HOST}/${BUSINESS_ID}/a.webp`,
      `${HOST}/${BUSINESS_ID}/b.webp`,
    ]);

    // An absolute URL bakes the Supabase project host into the row — the
    // portability bug the seeds were rewritten to fix.
    expect(writeChain.update.mock.calls[0]![0]).toEqual({
      interior_images: [`${BUSINESS_ID}/a.webp`, `${BUSINESS_ID}/b.webp`],
    });
  });
});

describe('updateBusinessGalleryAction — storage cleanup', () => {
  it('deletes only the files that left the gallery', async () => {
    const { remove } = mockSupabase({
      current: [`${BUSINESS_ID}/a.webp`, `${BUSINESS_ID}/b.webp`],
      next: [`${BUSINESS_ID}/a.webp`],
    });

    await updateBusinessGalleryAction(BUSINESS_ID, [
      `${HOST}/${BUSINESS_ID}/a.webp`,
    ]);

    expect(remove).toHaveBeenCalledWith([`${BUSINESS_ID}/b.webp`]);
  });

  /**
   * 🔴 The regression that motivated `storagePathsToDelete`. The column holds
   * two representations of the same file — registration writes raw paths, the
   * upload route writes absolute URLs — and the read layer resolves paths to
   * URLs, so the client always hands back URLs. A direct comparison matched
   * nothing and deleted the owner's entire gallery on their first save.
   */
  it('does NOT delete photos whose stored form is a raw path and whose sent form is a URL', async () => {
    const { remove } = mockSupabase({
      current: [`${BUSINESS_ID}/a.webp`, `${BUSINESS_ID}/b.webp`],
      next: [`${BUSINESS_ID}/a.webp`, `${BUSINESS_ID}/b.webp`],
    });

    await updateBusinessGalleryAction(BUSINESS_ID, [
      `${HOST}/${BUSINESS_ID}/a.webp`,
      `${HOST}/${BUSINESS_ID}/b.webp`,
    ]);

    expect(remove).not.toHaveBeenCalled();
  });

  it('does not delete anything when the write failed', async () => {
    const { remove } = mockSupabase({
      current: [`${BUSINESS_ID}/a.webp`],
      next: [],
      writeError: { message: 'boom' },
    });

    const result = await updateBusinessGalleryAction(BUSINESS_ID, []);

    expect(result.success).toBe(false);
    expect(remove).not.toHaveBeenCalled();
  });

  it('logs a failed cleanup instead of letting it vanish', async () => {
    // `storage.remove()` RESOLVES with `{ error }` rather than throwing, so a
    // `.catch()` could never fire and the failure would be invisible even
    // server-side.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { remove } = mockSupabase({
      current: [`${BUSINESS_ID}/a.webp`],
      next: [],
    });
    remove.mockResolvedValue({ data: null, error: { message: 'nope' } });

    const result = await updateBusinessGalleryAction(BUSINESS_ID, []);

    // The save still succeeded — an orphaned file is housekeeping, not the
    // owner's problem.
    expect(result.success).toBe(true);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('updateBusinessGalleryAction — failures', () => {
  it('reports a read failure without writing', async () => {
    const { writeChain } = mockSupabase({
      current: [],
      next: [],
      readError: { message: 'relation does not exist' },
    });

    const result = await updateBusinessGalleryAction(BUSINESS_ID, []);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('DB_ERROR');
    expect(writeChain.update).not.toHaveBeenCalled();
  });

  it('never puts driver text in the client message', async () => {
    mockSupabase({
      current: [],
      next: [],
      writeError: {
        message: 'null value in column "interior_images" violates ...',
      },
    });

    const result = await updateBusinessGalleryAction(BUSINESS_ID, []);

    expect(result.error?.message).not.toContain('interior_images');
    expect(result.error?.message).not.toContain('violates');
  });
});
