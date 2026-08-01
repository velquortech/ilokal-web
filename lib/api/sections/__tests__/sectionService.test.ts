import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockClient = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));

vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(async () => mockClient),
}));

import * as sectionService from '../sectionService';

/**
 * The service's whole job is translating a SQLSTATE into copy an owner can act
 * on, without ever forwarding the driver's own message — which names tables,
 * columns and constraints. These pin each mapping and, just as importantly,
 * that the raw text never survives.
 */

type Result = { data: unknown; error: unknown };

/** A chainable PostgREST double whose terminal call resolves to `result`. */
function chain(result: Result) {
  const c: Record<string, unknown> = {};
  for (const m of [
    'select',
    'insert',
    'update',
    'eq',
    'is',
    'order',
    'limit',
  ]) {
    c[m] = vi.fn(() => c);
  }
  c.single = vi.fn(async () => result);
  c.maybeSingle = vi.fn(async () => result);
  // Reorder awaits the builder itself (after .select('id')), and now COUNTS
  // the returned rows — a chain resolving to `data: null` is what a stale or
  // foreign id looks like.
  c.then = (resolve: (v: Result) => unknown) =>
    Promise.resolve(result).then(resolve);
  return c;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createSection', () => {
  it('appends after the current last position', async () => {
    const positionChain = chain({ data: { position: 4 }, error: null });
    const insertChain = chain({
      data: { id: 's1', name: 'Hot Drinks', position: 5 },
      error: null,
    });
    mockClient.from
      .mockReturnValueOnce(positionChain)
      .mockReturnValueOnce(insertChain);

    const res = await sectionService.createSection('biz-1', '  Hot Drinks  ');

    expect(res.success).toBe(true);
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        business_id: 'biz-1',
        // Trimmed, matching the DB's char_length(btrim(name)) CHECK.
        name: 'Hot Drinks',
        position: 5,
      }),
    );
  });

  it('starts at position 0 for the first section', async () => {
    const positionChain = chain({ data: null, error: null });
    const insertChain = chain({ data: { id: 's1' }, error: null });
    mockClient.from
      .mockReturnValueOnce(positionChain)
      .mockReturnValueOnce(insertChain);

    await sectionService.createSection('biz-1', 'First');

    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ position: 0 }),
    );
  });

  it('maps a unique violation to duplicate-name copy, not the driver text', async () => {
    mockClient.from
      .mockReturnValueOnce(chain({ data: null, error: null }))
      .mockReturnValueOnce(
        chain({
          data: null,
          error: {
            code: '23505',
            message:
              'duplicate key value violates unique constraint "uq_product_sections_business_name"',
          },
        }),
      );

    const res = await sectionService.createSection('biz-1', 'Hot Drinks');

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('DUPLICATE_NAME');
    expect(res.error?.message).toBe(
      'You already have a section with that name.',
    );
    expect(res.error?.message).not.toContain('uq_product_sections');
  });

  it('maps the IL003 cap trigger to a limit message', async () => {
    mockClient.from
      .mockReturnValueOnce(chain({ data: null, error: null }))
      .mockReturnValueOnce(
        chain({
          data: null,
          error: {
            code: 'IL003',
            message: 'A shop can have at most 30 sections.',
          },
        }),
      );

    const res = await sectionService.createSection('biz-1', 'Too Many');

    expect(res.error?.code).toBe('LIMIT_REACHED');
    expect(res.error?.message).toContain('30');
  });

  it('maps an RLS denial to an access message', async () => {
    mockClient.from
      .mockReturnValueOnce(chain({ data: null, error: null }))
      .mockReturnValueOnce(
        chain({
          data: null,
          error: {
            code: '42501',
            message:
              'new row violates row-level security policy for table "product_sections"',
          },
        }),
      );

    const res = await sectionService.createSection('biz-1', 'Nope');

    expect(res.error?.code).toBe('UNAUTHORIZED');
    expect(res.error?.message).not.toContain('row-level security');
  });

  it('falls back to generic copy for an unknown SQLSTATE', async () => {
    mockClient.from
      .mockReturnValueOnce(chain({ data: null, error: null }))
      .mockReturnValueOnce(
        chain({
          data: null,
          error: {
            code: 'XX000',
            message: 'internal: relation products_x does not exist',
          },
        }),
      );

    const res = await sectionService.createSection('biz-1', 'Whatever');

    expect(res.error?.code).toBe('INTERNAL_ERROR');
    expect(res.error?.message).not.toContain('products_x');
  });
});

describe('renameSection', () => {
  it('scopes the write to the business and to live rows', async () => {
    const c = chain({ data: { id: 's1', name: 'Cold Drinks' }, error: null });
    mockClient.from.mockReturnValue(c);

    const res = await sectionService.renameSection(
      'biz-1',
      's1',
      ' Cold Drinks ',
    );

    expect(res.success).toBe(true);
    expect(c.update).toHaveBeenCalledWith({ name: 'Cold Drinks' });
    expect(c.eq).toHaveBeenCalledWith('id', 's1');
    expect(c.eq).toHaveBeenCalledWith('business_id', 'biz-1');
    expect(c.is).toHaveBeenCalledWith('archived_at', null);
  });
});

describe('archiveSection', () => {
  it('soft-deletes rather than deleting, and never touches products', async () => {
    const c = chain({ data: { id: 's1' }, error: null });
    mockClient.from.mockReturnValue(c);

    const res = await sectionService.archiveSection('biz-1', 's1');

    expect(res.success).toBe(true);
    // Products are released by the DB trigger, not from here — a client-side
    // sweep would race the archive and could half-finish.
    expect(mockClient.from).toHaveBeenCalledTimes(1);
    expect(mockClient.from).toHaveBeenCalledWith('product_sections');
    expect(c.update).toHaveBeenCalledWith(
      expect.objectContaining({ archived_at: expect.any(String) }),
    );
  });
});

describe('reorderSections', () => {
  it('writes each id its index, so a retry converges', async () => {
    const c = chain({ data: [{ id: 'x' }], error: null });
    mockClient.from.mockReturnValue(c);

    const res = await sectionService.reorderSections('biz-1', ['a', 'b', 'c']);

    expect(res.success).toBe(true);
    expect(c.update).toHaveBeenNthCalledWith(1, { position: 0 });
    expect(c.update).toHaveBeenNthCalledWith(2, { position: 1 });
    expect(c.update).toHaveBeenNthCalledWith(3, { position: 2 });
  });

  it('refuses to claim success when a row matched nothing', async () => {
    // A stale, foreign or already-archived id updates zero rows without
    // erroring. Reporting that as "Order saved" tells the owner their menu is
    // in an order the database has never seen.
    const applied = chain({ data: [{ id: 'a' }], error: null });
    const missed = chain({ data: [], error: null });
    mockClient.from.mockReturnValueOnce(applied).mockReturnValueOnce(missed);

    const res = await sectionService.reorderSections('biz-1', ['a', 'gone']);

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('NOT_FOUND');
  });

  it('reports a failure from any row in the batch', async () => {
    const ok = chain({ data: null, error: null });
    const bad = chain({
      data: null,
      error: { code: '42501', message: 'denied' },
    });
    mockClient.from.mockReturnValueOnce(ok).mockReturnValueOnce(bad);

    const res = await sectionService.reorderSections('biz-1', ['a', 'b']);

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('UNAUTHORIZED');
  });
});
