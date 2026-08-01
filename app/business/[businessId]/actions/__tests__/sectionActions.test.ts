import { describe, it, expect, vi, beforeEach } from 'vitest';

const verifyBusinessOwner = vi.hoisted(() => vi.fn());
const service = vi.hoisted(() => ({
  createSection: vi.fn(),
  renameSection: vi.fn(),
  archiveSection: vi.fn(),
  reorderSections: vi.fn(),
}));
const revalidatePath = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api/verifyBusinessOwner', () => ({ verifyBusinessOwner }));
vi.mock('@/lib/api/sections/sectionService', () => service);
vi.mock('next/cache', () => ({ revalidatePath }));

import {
  archiveSectionAction,
  createSectionAction,
  renameSectionAction,
  reorderSectionsAction,
} from '../sectionActions';

const OK_OWNER = { authorized: true, business: { id: 'verified-biz' } };

beforeEach(() => {
  vi.clearAllMocks();
  verifyBusinessOwner.mockResolvedValue(OK_OWNER);
  service.createSection.mockResolvedValue({
    success: true,
    data: { id: 's1' },
  });
  service.renameSection.mockResolvedValue({
    success: true,
    data: { id: 's1' },
  });
  service.archiveSection.mockResolvedValue({
    success: true,
    data: { id: 's1' },
  });
  service.reorderSections.mockResolvedValue({
    success: true,
    data: { updated: 2 },
  });
});

/**
 * Every export in a `'use server'` file is a live, publicly invocable
 * endpoint. The assertions that matter are therefore the boring ones: the
 * guard runs FIRST, and the id that reaches the database is the VERIFIED one,
 * never the string the caller sent.
 */
describe('section actions — authorization', () => {
  it.each([
    ['create', () => createSectionAction('attacker-supplied', 'X')],
    ['rename', () => renameSectionAction('attacker-supplied', 's1', 'X')],
    ['archive', () => archiveSectionAction('attacker-supplied', 's1')],
    [
      'reorder',
      () =>
        reorderSectionsAction('attacker-supplied', [
          '11111111-1111-1111-1111-111111111111',
        ]),
    ],
  ])(
    '%s refuses a non-owner and never touches the service',
    async (_n, call) => {
      verifyBusinessOwner.mockResolvedValue({
        authorized: false,
        error: { code: 'FORBIDDEN', message: 'nope' },
      });

      const res = await call();

      expect(res.success).toBe(false);
      expect(service.createSection).not.toHaveBeenCalled();
      expect(service.renameSection).not.toHaveBeenCalled();
      expect(service.archiveSection).not.toHaveBeenCalled();
      expect(service.reorderSections).not.toHaveBeenCalled();
      expect(revalidatePath).not.toHaveBeenCalled();
    },
  );

  it('passes the VERIFIED business id to the service, not the caller’s', async () => {
    await createSectionAction('caller-claimed-biz', 'Hot Drinks');
    expect(service.createSection).toHaveBeenCalledWith(
      'verified-biz',
      'Hot Drinks',
    );
  });

  it('never returns a NextResponse-shaped error to the client', async () => {
    // verifyBusinessOwner is shared with route handlers and can hand back a
    // NextResponse; a Server Action must not try to serialize one.
    verifyBusinessOwner.mockResolvedValue({
      authorized: false,
      error: { status: 401, headers: {} },
    });

    const res = await createSectionAction('biz', 'X');

    expect(res.success).toBe(false);
    expect(res.error).toEqual({
      code: 'UNAUTHORIZED',
      message: 'You do not have access to this shop.',
    });
  });
});

describe('section actions — validation', () => {
  it('rejects a blank name before hitting the database', async () => {
    const res = await createSectionAction('biz', '   ');
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('VALIDATION_ERROR');
    expect(service.createSection).not.toHaveBeenCalled();
  });

  it('rejects a name over the 40-character DB limit', async () => {
    const res = await createSectionAction('biz', 'x'.repeat(41));
    expect(res.success).toBe(false);
    expect(service.createSection).not.toHaveBeenCalled();
  });

  it('rejects non-guid ids in a reorder', async () => {
    const res = await reorderSectionsAction('biz', ['not-a-uuid']);
    expect(res.success).toBe(false);
    expect(service.reorderSections).not.toHaveBeenCalled();
  });

  it('rejects a duplicated id in a reorder', async () => {
    // A repeated id writes two positions to one row and leaves another
    // section's position unwritten — the order silently collapses.
    const id = '11111111-1111-1111-1111-111111111111';
    const res = await reorderSectionsAction('biz', [id, id]);
    expect(res.success).toBe(false);
    expect(service.reorderSections).not.toHaveBeenCalled();
  });

  it('rejects more ids than a shop can hold', async () => {
    const ids = Array.from(
      { length: 31 },
      (_, i) =>
        `1111111${i.toString().padStart(1, '0')}-1111-1111-1111-111111111111`,
    );
    const res = await reorderSectionsAction('biz', ids);
    expect(res.success).toBe(false);
    expect(service.reorderSections).not.toHaveBeenCalled();
  });

  it.each([
    ['rename', () => renameSectionAction('biz', 'not-a-uuid', 'X')],
    ['archive', () => archiveSectionAction('biz', 'not-a-uuid')],
  ])(
    '%s refuses a malformed section id before touching the DB',
    async (_n, call) => {
      // Otherwise it reaches Postgres as a 22P02 and maps to INTERNAL_ERROR — a
      // refusal dressed up as a server fault.
      const res = await call();
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('VALIDATION_ERROR');
      expect(service.renameSection).not.toHaveBeenCalled();
      expect(service.archiveSection).not.toHaveBeenCalled();
    },
  );
});

describe('section actions — cache', () => {
  it('revalidates the catalogue and the public-facing shop page on success', async () => {
    await createSectionAction('biz', 'Hot Drinks');
    const paths = revalidatePath.mock.calls.map((c) => c[0]);
    expect(paths).toContain('/business/verified-biz/product-catalogues');
    expect(paths).toContain('/business/verified-biz/shop');
  });

  it('does not revalidate when the write failed', async () => {
    service.createSection.mockResolvedValue({
      success: false,
      error: { code: 'DUPLICATE_NAME', message: 'dupe' },
    });
    await createSectionAction('biz', 'Hot Drinks');
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
