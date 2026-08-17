/**
 * Make a Supabase error readable in a log line.
 *
 * `PostgrestError` carries its fields non-enumerably, so `console.error(err)`
 * renders `{}` — which is exactly how a missing RPC (an unapplied migration,
 * PostgREST code `PGRST202`) surfaced as `[getPublicBusinessProfile rating] {}`:
 * an error report that names no error. Flatten the four fields that identify
 * the fault instead.
 *
 * Server-side logging only. The flattened text names tables, columns and
 * constraints, so it must never reach a client response.
 */
export function describeDbError(error: unknown): {
  code: string;
  message: string;
  details?: string;
  hint?: string;
} {
  const e = error as {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
  } | null;
  return {
    code: e?.code ?? 'UNKNOWN',
    message: e?.message ?? String(error),
    details: e?.details ?? undefined,
    hint: e?.hint ?? undefined,
  };
}

/**
 * True for the PostgREST/Postgres error objects the app logs: plain objects
 * (NOT `Error` instances) carrying the SQLSTATE `code` and/or a `message`.
 * `PostgrestError` instances match because `in` sees their prototype fields
 * even though they are non-enumerable.
 */
export function isDbErrorShape(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    !(error instanceof Error) &&
    ('code' in error || 'message' in error)
  );
}

/**
 * Format an error for a console log line: flatten DB-shaped errors (which
 * would otherwise render `{}`) with `describeDbError`, and pass everything
 * else through untouched — a real `Error` keeps its stack, a redirect digest
 * keeps its shape.
 *
 * The single idiom for raw `console.error('[ctx]', error)` call sites, so the
 * flattening stays consistent whether the call is in an `if (error)` branch
 * (definitely a PostgrestError) or a `catch` (unknown).
 */
export function formatErrorForLog(error: unknown): unknown {
  return isDbErrorShape(error) ? describeDbError(error) : error;
}
