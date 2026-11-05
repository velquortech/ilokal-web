import { describe, it, expect, vi } from 'vitest';

vi.mock('@/supabase/server', () => ({ createServerSupabaseClient: vi.fn() }));

import {
  buildModerationQueue,
  type ModeratedRow,
  type ReviewReport,
} from '../reviewModerationQuery';

const review = (id: string, extra: Partial<ModeratedRow> = {}) => ({
  id,
  user_id: `u-${id}`,
  business_id: `b-${id}`,
  rating: 2,
  comment: 'meh',
  evidence: 'checkin',
  created_at: '2026-10-01T00:00:00Z',
  ...extra,
});

const report = (rating_id: string, created_at: string): ReviewReport => ({
  rating_id,
  reason: 'spam',
  note: null,
  created_at,
});

describe('buildModerationQueue', () => {
  const names = {
    shopNames: new Map([['b-a', 'Kape Ni Lola']]),
    authorNames: new Map([['u-a', 'Ana']]),
  };

  it('lists only published reviews that have reports, most-reported first', () => {
    const queue = buildModerationQueue({
      reports: [
        report('a', '2026-10-02T00:00:00Z'),
        report('b', '2026-10-05T00:00:00Z'),
        report('b', '2026-10-03T00:00:00Z'),
      ],
      published: [review('a'), review('b'), review('c')],
      moderated: [],
      ...names,
    });

    expect(queue.reported.map((r) => r.id)).toEqual(['b', 'a']);
    expect(queue.reported[0].reports.map((r) => r.created_at)).toEqual([
      '2026-10-05T00:00:00Z',
      '2026-10-03T00:00:00Z',
    ]);
  });

  it('breaks a report-count tie by the most recent report', () => {
    const queue = buildModerationQueue({
      reports: [
        report('a', '2026-10-01T00:00:00Z'),
        report('b', '2026-10-09T00:00:00Z'),
      ],
      published: [review('a'), review('b')],
      moderated: [],
      ...names,
    });
    expect(queue.reported.map((r) => r.id)).toEqual(['b', 'a']);
  });

  it('decorates names, falling back when a lookup is missing', () => {
    const queue = buildModerationQueue({
      reports: [
        report('a', '2026-10-02T00:00:00Z'),
        report('z', '2026-10-02T00:00:00Z'),
      ],
      published: [review('a'), review('z')],
      moderated: [],
      ...names,
    });
    const a = queue.reported.find((r) => r.id === 'a')!;
    const z = queue.reported.find((r) => r.id === 'z')!;
    expect([a.shop_name, a.author_name]).toEqual(['Kape Ni Lola', 'Ana']);
    expect([z.shop_name, z.author_name]).toEqual([
      'Unknown shop',
      'Unknown user',
    ]);
  });

  it('carries moderated rows through with their status, reason and reports', () => {
    const queue = buildModerationQueue({
      reports: [report('m', '2026-10-02T00:00:00Z')],
      published: [],
      moderated: [
        {
          ...review('m'),
          status: 'hidden',
          reason: 'auto:reports',
          moderated_at: '2026-10-03T00:00:00Z',
        },
      ],
      ...names,
    });
    expect(queue.reported).toEqual([]);
    expect(queue.moderated[0]).toMatchObject({
      id: 'm',
      status: 'hidden',
      moderation_reason: 'auto:reports',
      moderated_at: '2026-10-03T00:00:00Z',
    });
    expect(queue.moderated[0].reports).toHaveLength(1);
  });
});
