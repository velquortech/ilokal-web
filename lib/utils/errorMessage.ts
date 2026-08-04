/**
 * Turning failures into something a user can act on.
 *
 * Two jobs, deliberately in one file because they are the two ends of the same
 * problem:
 *
 *   `toUserMessage`    — server side: a Postgres/PostgREST error becomes copy.
 *   `serverErrorText`  — client side: a caught Error becomes copy, and never
 *                        Next.js's production redaction notice.
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE: a raw driver message never reaches a
 * user. Postgres errors name tables, columns and constraints
 * (CLAUDE.md §Error leakage), so every code is mapped to hand-written text.
 * The one sanctioned exception is the private `IL0xx` SQLSTATE class, which
 * only this app's own RPCs raise — a message carrying one is provably ours.
 */

/** What a failing call gives us. Shaped like PostgrestError without importing it. */
export interface DbErrorLike {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
}

/**
 * The noun a message talks about — "A **coupon** with that code already
 * exists". Passing it lets one mapper serve every domain instead of each
 * service carrying its own copy of the switch.
 */
export interface ErrorContext {
  /** Lower-case singular: 'coupon', 'branch', 'offering', 'event'. */
  noun?: string;
  /** Overrides the generic fallback when nothing more specific matches. */
  fallback?: string;
}

export const GENERIC_ERROR = 'Something went wrong. Please try again.';

/**
 * Next.js replaces a thrown Server Action / Server Component message with this
 * in production builds. It is the string the user reported seeing.
 *
 * Matched on a distinctive fragment rather than the whole sentence: the exact
 * wording has changed between Next releases, but "omitted in production" and
 * the digest sentence have been stable, and matching loosely fails safe (we
 * show our own copy) while matching strictly fails open (we show theirs).
 */
const NEXT_REDACTION_MARKERS = [
  'omitted in production',
  'server components render',
  'a digest property is included',
  'an error occurred in the server component',
];

/** True when `message` is Next's placeholder rather than real information. */
export function isRedactedMessage(message: string | null | undefined): boolean {
  if (!message) return true;
  const lower = message.toLowerCase();
  return NEXT_REDACTION_MARKERS.some((marker) => lower.includes(marker));
}

function withNoun(
  noun: string | undefined,
  withIt: string,
  without: string,
): string {
  return noun ? withIt.replace('{noun}', noun) : without;
}

/**
 * A Postgres / PostgREST error as user-facing copy.
 *
 * Codes chosen from what this schema actually raises — the CHECK constraints,
 * partial unique indexes and RESTRICTIVE RLS policies in `supabase/migrations`
 * — not from the full SQLSTATE table.
 */
export function toUserMessage(
  error: DbErrorLike | null | undefined,
  context: ErrorContext = {},
): string {
  const { noun, fallback = GENERIC_ERROR } = context;
  if (!error) return fallback;

  switch (error.code) {
    // 23505 unique_violation — the commonest *user-fixable* write failure:
    // a duplicate coupon code, a section name that already exists.
    case '23505':
      return withNoun(
        noun,
        'That {noun} already exists. Try a different name or code.',
        'That already exists. Try a different name or code.',
      );

    // 23503 foreign_key_violation — on delete it means "something still points
    // at this", which is worth saying rather than "failed to delete".
    case '23503':
      return withNoun(
        noun,
        'This {noun} is still in use, so it can’t be removed yet.',
        'This is still in use, so it can’t be removed yet.',
      );

    // 23514 check_violation / 22001 too-long / 22P02 bad input syntax — the
    // value broke a rule. The constraint NAME must not be surfaced.
    case '23514':
    case '22001':
    case '22P02':
      return 'Some of those details aren’t valid. Please check the form and try again.';

    // 23502 not_null_violation — a required field arrived empty.
    case '23502':
      return 'Something required is missing. Please fill in every required field.';

    // 42501 insufficient_privilege — an RLS policy refused. Real causes: not
    // signed in, not the owner, or a gate like SEC-4's rating rule.
    case '42501':
      return 'You don’t have permission to do that.';

    // PGRST116 — PostgREST's "no rows returned" from `.single()`.
    // P0002 — no_data_found raised inside a function.
    case 'PGRST116':
    case 'P0002':
      return withNoun(
        noun,
        'That {noun} no longer exists.',
        'That item no longer exists.',
      );

    // 40001 serialization_failure / 40P01 deadlock — genuinely transient, so
    // the copy invites the retry that will probably work.
    case '40001':
    case '40P01':
      return 'That didn’t go through — please try again.';

    // 57014 query_canceled / 08006 connection_failure — infrastructure.
    case '57014':
    case '08006':
    case '08003':
      return 'The server took too long to respond. Please try again.';

    default:
      // The private class this app raises on purpose (IL001/IL002/IL003 …).
      // Only our own RPCs use it, so the message is ours and safe to show.
      if (error.code?.startsWith('IL') && error.message?.trim()) {
        const text = error.message.trim();
        return text.charAt(0).toUpperCase() + text.slice(1);
      }
      return fallback;
  }
}

/**
 * A network-layer failure (offline, DNS, connection refused) rather than a
 * server refusal. Worth distinguishing: one is the user's connection and
 * retrying works, the other is not and it won't.
 */
export function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const name = error.name.toLowerCase();
  const message = error.message.toLowerCase();
  return (
    name === 'typeerror' &&
    (message.includes('fetch') ||
      message.includes('network') ||
      message.includes('load failed'))
  );
}

/**
 * A caught client-side error as text safe to render.
 *
 * THE POINT: `error instanceof Error ? error.message : fallback` looks correct
 * and is not. In a production build Next replaces the message of anything
 * thrown from a Server Action with its redaction notice — but the object is
 * still an `Error`, so that ternary always takes the first branch and renders
 * the notice. The fallback beside it is unreachable exactly when it is needed,
 * which is why the bug survived review: `yarn dev` never redacts.
 */
export function serverErrorText(
  error: unknown,
  fallback: string = GENERIC_ERROR,
): string {
  if (isNetworkError(error)) {
    return 'Couldn’t reach the server. Check your connection and try again.';
  }
  if (error instanceof Error && !isRedactedMessage(error.message)) {
    return error.message;
  }
  if (typeof error === 'string' && !isRedactedMessage(error)) {
    return error;
  }
  return fallback;
}
