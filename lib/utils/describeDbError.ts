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
