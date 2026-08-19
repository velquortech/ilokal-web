// Rate limiting for the web upload surface (`/api/web/upload/**`).
//
// The proxy rate-limits the mobile API, but its matcher does NOT cover
// `/api/web` — so every upload route was unthrottled. These routes are the most
// expensive in the app: each one buffers a 2–4 MB body and then runs a sharp
// decode/re-encode (`uploadWebP`) before writing to storage. An authenticated
// caller could spend CPU and storage quota at will.
//
// ONE shared bucket across every upload endpoint, deliberately. There are six
// POST doors plus the DELETE, and a per-route budget would let a caller
// multiply their allowance by rotating between them — the same defect the login
// door already fixed by sharing `auth:login:*` between the API route and the
// Server Action. One namespace, one budget.
//
// Keyed on the AUTHENTICATED user id, never a client-supplied one: the avatar
// route accepts a `userId` form field for admin edits, and keying on that would
// let an attacker rotate it for free budget.
//
// Same in-memory/per-instance limitation as rateLimit.ts — a baseline flood
// guard, not a distributed quota (swap the store for Upstash/KV behind the
// `rateLimit()` signature).

import { NextResponse } from 'next/server';
import { rateLimit } from './rateLimit';

const UPLOAD_LIMIT = Number(process.env.WEB_UPLOAD_RATE_LIMIT ?? 30);
const UPLOAD_WINDOW_MS = Number(
  process.env.WEB_UPLOAD_RATE_WINDOW_MS ?? 60_000,
);

/**
 * Enforce the upload rate limit for one authenticated caller.
 *
 * Returns a ready-to-return 429 `NextResponse` when the budget is spent, or
 * `null` to proceed. Call it AFTER the auth/ownership check (so the key is a
 * verified identity) but BEFORE `request.formData()` — buffering the body and
 * re-encoding the image is the cost this guard exists to prevent.
 *
 * The body is `{ error }`, NOT the `{ message }` of the shared
 * `tooManyRequestsResponse`: these routes speak `{ error }` and their clients
 * read it (`BannerUploader` does `json.error ?? 'Banner upload failed'`), so a
 * `{ message }` body would render as a generic failure and invite the immediate
 * retry that makes a flood worse.
 */
export function checkUploadRateLimit(userId: string): NextResponse | null {
  const { allowed, retryAfterSec } = rateLimit(
    `web-upload:${userId}`,
    UPLOAD_LIMIT,
    UPLOAD_WINDOW_MS,
  );

  if (allowed) return null;

  return NextResponse.json(
    { error: 'Too many uploads — please try again in a moment' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
  );
}
