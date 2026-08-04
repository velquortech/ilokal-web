/**
 * A user's search term, made safe for a PostgREST filter string.
 *
 * `.or()` takes a string, not parameters: `name.ilike.%foo%,address.ilike.%foo%`.
 * Commas separate the conditions and parentheses group them, so a term
 * containing either **rewrites the filter** rather than being matched by it —
 * at best a 400 that renders as "couldn't load", at worst a condition the
 * caller did not ask for. `%` and `_` are `ilike` wildcards, so an unescaped
 * `%` turns a search into a scan.
 *
 * Two defences, both needed:
 *
 * 1. Escape the wildcards and the quoting characters.
 * 2. Wrap the whole thing in double quotes. Inside a quoted PostgREST value a
 *    comma, a dot and a parenthesis are literal — which is what makes a term
 *    like "Iznart St., Iloilo" work at all.
 *
 * Extracted from `lib/api/admin/userQuery.ts`, which had it inline; the events
 * search was the third call site that would have needed it (CLAUDE.md §DRY).
 */
export function ilikePattern(term: string): string {
  const escaped = term
    // Backslash first, or it would double-escape everything added after it.
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "''")
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');

  return `"%${escaped}%"`;
}
