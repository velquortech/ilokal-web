/**
 * Keyset (cursor) pagination helpers.
 *
 * A cursor encodes the sort key of the last row of a page — here
 * `(created_at, id)` — so the next page can be fetched with a strict
 * `(created_at, id) < (cursor.created_at, cursor.id)` comparison instead of an
 * OFFSET. This is stable under inserts and scales independent of page depth.
 *
 * The encoded form is an opaque, URL-safe base64 string; callers must treat it
 * as opaque and only pass back what a previous page returned.
 */

export interface Cursor {
  created_at: string;
  id: string;
}

const SEPARATOR = '|';

function toBase64(value: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'utf8').toString('base64url');
  }
  // Browser fallback (not used by server actions, but keeps the util isomorphic)
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64(value: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'base64url').toString('utf8');
  }
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  return atob(padded);
}

/** Encode `(created_at, id)` into an opaque cursor string. */
export function encodeCursor(cursor: Cursor): string {
  return toBase64(`${cursor.created_at}${SEPARATOR}${cursor.id}`);
}

/**
 * Decode an opaque cursor back into `(created_at, id)`.
 * Returns `null` for malformed / empty input so callers can treat a bad cursor
 * as "start from the first page" rather than throwing.
 */
export function decodeCursor(raw?: string | null): Cursor | null {
  if (!raw) return null;
  let decoded: string;
  try {
    decoded = fromBase64(raw);
  } catch {
    return null;
  }
  const sep = decoded.indexOf(SEPARATOR);
  if (sep === -1) return null;
  const created_at = decoded.slice(0, sep);
  const id = decoded.slice(sep + 1);
  if (!created_at || !id) return null;
  return { created_at, id };
}
