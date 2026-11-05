import { createServerSupabaseClient } from '@/supabase/server';
import { formatErrorForLog } from '@/lib/utils/describeDbError';

/**
 * Admin review-moderation queue.
 *
 * Two lists, both read with the admin's own RLS-scoped client (every table
 * involved grants admins SELECT through `is_admin()`):
 *
 *   - **reported** — PUBLISHED reviews (`business_ratings`) with at least one
 *     report. Three distinct reporters auto-hide a review, so anything still
 *     here has 1–2 reports and is waiting on a human.
 *   - **moderated** — reviews moved into `business_rating_moderation`
 *     (`hidden` by reports or an admin, or `removed`), newest first.
 *
 * Reports have no FK to the rating (the row moves between the two tables), so
 * they are joined here by `rating_id`.
 */

export type ReportReason =
  | 'fake'
  | 'offensive'
  | 'spam'
  | 'personal_info'
  | 'other';

export interface ReviewReport {
  rating_id: string;
  reason: ReportReason;
  note: string | null;
  created_at: string;
}

interface ReviewBase {
  id: string;
  user_id: string;
  business_id: string;
  rating: number;
  comment: string | null;
  evidence: string;
  created_at: string;
}

export interface ModeratedRow extends ReviewBase {
  status: 'hidden' | 'removed';
  reason: string;
  moderated_at: string;
}

export interface QueueItem extends ReviewBase {
  shop_name: string;
  author_name: string;
  reports: ReviewReport[];
}

export interface ModeratedItem extends QueueItem {
  status: 'hidden' | 'removed';
  moderation_reason: string;
  moderated_at: string;
}

export interface ModerationQueue {
  reported: QueueItem[];
  moderated: ModeratedItem[];
}

const MODERATED_LIMIT = 100;
const REPORT_LIMIT = 1000;

/**
 * Pure join of the raw rows into the two lists. Reported items are ordered by
 * report count, then by their latest report — the review closest to the
 * auto-hide threshold, most recently flagged, comes first.
 */
export function buildModerationQueue(input: {
  reports: ReviewReport[];
  published: ReviewBase[];
  moderated: ModeratedRow[];
  shopNames: Map<string, string>;
  authorNames: Map<string, string>;
}): ModerationQueue {
  const byRating = new Map<string, ReviewReport[]>();
  for (const r of input.reports) {
    const list = byRating.get(r.rating_id) ?? [];
    list.push(r);
    byRating.set(r.rating_id, list);
  }

  const decorate = (row: ReviewBase) => ({
    ...row,
    shop_name: input.shopNames.get(row.business_id) ?? 'Unknown shop',
    author_name: input.authorNames.get(row.user_id) ?? 'Unknown user',
    reports: (byRating.get(row.id) ?? []).sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    ),
  });

  const reported = input.published
    .filter((row) => byRating.has(row.id))
    .map(decorate)
    .sort(
      (a, b) =>
        b.reports.length - a.reports.length ||
        b.reports[0].created_at.localeCompare(a.reports[0].created_at),
    );

  const moderated = input.moderated.map((row) => ({
    ...decorate(row),
    status: row.status,
    moderation_reason: row.reason,
    moderated_at: row.moderated_at,
  }));

  return { reported, moderated };
}

export async function getReviewModerationQueue(): Promise<ModerationQueue> {
  const supabase = await createServerSupabaseClient();

  const [reportsRes, moderatedRes] = await Promise.all([
    supabase
      .from('business_rating_reports')
      .select('rating_id, reason, note, created_at')
      .order('created_at', { ascending: false })
      .limit(REPORT_LIMIT),
    supabase
      .from('business_rating_moderation')
      .select(
        'id, user_id, business_id, rating, comment, evidence, created_at, status, reason, moderated_at',
      )
      .order('moderated_at', { ascending: false })
      .limit(MODERATED_LIMIT),
  ]);
  if (reportsRes.error) throw reportsRes.error;
  if (moderatedRes.error) throw moderatedRes.error;

  const reports = (reportsRes.data ?? []) as ReviewReport[];
  const moderated = (moderatedRes.data ?? []) as ModeratedRow[];
  const reportedIds = [...new Set(reports.map((r) => r.rating_id))];

  let published: ReviewBase[] = [];
  if (reportedIds.length > 0) {
    const { data, error } = await supabase
      .from('business_ratings')
      .select('id, user_id, business_id, rating, comment, evidence, created_at')
      .in('id', reportedIds);
    if (error) throw error;
    published = (data ?? []) as ReviewBase[];
  }

  const rows = [...published, ...moderated];
  const businessIds = [...new Set(rows.map((r) => r.business_id))];
  const userIds = [...new Set(rows.map((r) => r.user_id))];

  const [shopsRes, authorsRes] = await Promise.all([
    businessIds.length
      ? supabase
          .from('businesses')
          .select('id, shop_name')
          .in('id', businessIds)
      : Promise.resolve({ data: [], error: null }),
    userIds.length
      ? supabase.from('profiles').select('id, full_name').in('id', userIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  // Names are decoration: a failed lookup degrades to "Unknown", it doesn't
  // hide the queue from the moderator.
  if (shopsRes.error)
    console.error(
      '[reviewModeration:shops]',
      formatErrorForLog(shopsRes.error),
    );
  if (authorsRes.error)
    console.error(
      '[reviewModeration:authors]',
      formatErrorForLog(authorsRes.error),
    );

  const shopNames = new Map(
    ((shopsRes.data ?? []) as { id: string; shop_name: string | null }[]).map(
      (b) => [b.id, b.shop_name ?? 'Unnamed shop'],
    ),
  );
  const authorNames = new Map(
    ((authorsRes.data ?? []) as { id: string; full_name: string | null }[]).map(
      (p) => [p.id, p.full_name ?? 'Unnamed user'],
    ),
  );

  return buildModerationQueue({
    reports,
    published,
    moderated,
    shopNames,
    authorNames,
  });
}
