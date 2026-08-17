/**
 * View-ping route — ST1 and ST3 of `.claude/SENTRY_TRIAGE.md`.
 *
 * Two distinct things are pinned here, and they fail in opposite directions:
 *
 *  1. A 23503 foreign_key_violation must NOT 500 and must NOT report. It was
 *     the first real backend error to reach Sentry (JAVASCRIPT-NEXTJS-5), and
 *     it is unactionable server-side: the Android client is holding a business
 *     id that is not in `businesses`. A view ping is fire-and-forget telemetry.
 *
 *  2. Every OTHER failure must still report. The route previously ended in a
 *     bare `catch {}` that destroyed the cause entirely, so the risk of fixing
 *     (1) is over-swallowing — turning one silenced error into all of them.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';

vi.mock('@/app/api/helpers/mobile-request', () => ({
  getMobileUser: vi.fn(),
}));

import { getMobileUser } from '@/app/api/helpers/mobile-request';

const BUSINESS_ID = 'e6b73c4b-47f4-4e2b-b1d5-7b02e346e47d';

function makeRequest(): NextRequest {
  return new NextRequest(
    `http://localhost/api/mobile/businesses/${BUSINESS_ID}/view`,
    { method: 'POST' },
  );
}

const makeParams = () => ({
  params: Promise.resolve({ businessId: BUSINESS_ID }),
});

/** Stand in for the RLS-scoped client `getMobileUser` hands back. */
function mockAuth(rpcResult: { error: unknown }) {
  const rpc = vi.fn().mockResolvedValue(rpcResult);
  vi.mocked(getMobileUser).mockResolvedValue({
    user: { id: 'user-1' },
    token: 'jwt',
    supabase: { rpc },
  } as unknown as Awaited<ReturnType<typeof getMobileUser>>);
  return rpc;
}

describe('POST /api/mobile/businesses/[businessId]/view', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('records a view for a real business', async () => {
    const rpc = mockAuth({ error: null });

    const res = await POST(makeRequest(), makeParams());

    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('record_view', {
      p_business_id: BUSINESS_ID,
    });
  });

  it('returns 404 — not 500 — when the business id does not exist', async () => {
    // The exact PostgrestError shape observed in production.
    mockAuth({
      error: {
        code: '23503',
        message:
          'insert or update on table "view_events" violates foreign key constraint "view_events_business_id_fkey"',
        details: `Key (business_id)=(${BUSINESS_ID}) is not present in table "businesses".`,
        hint: null,
      },
    });

    const res = await POST(makeRequest(), makeParams());

    expect(res.status).toBe(404);
  });

  it('does not log or report the 23503 case', async () => {
    // `loggedServerError` is the only thing on this path that logs, and it is
    // also what reports to Sentry — so a silent console proves neither ran.
    mockAuth({
      error: {
        code: '23503',
        message:
          'insert or update on table "view_events" violates foreign key constraint "view_events_business_id_fkey"',
        details: `Key (business_id)=(${BUSINESS_ID}) is not present in table "businesses".`,
      },
    });

    await POST(makeRequest(), makeParams());

    expect(consoleError).not.toHaveBeenCalled();
  });

  it('leaks no driver text on the 404', async () => {
    mockAuth({
      error: {
        code: '23503',
        message:
          'insert or update on table "view_events" violates foreign key constraint "view_events_business_id_fkey"',
        details: `Key (business_id)=(${BUSINESS_ID}) is not present in table "businesses".`,
      },
    });

    const body = await (await POST(makeRequest(), makeParams())).text();

    expect(body).not.toMatch(/view_events|foreign key|constraint|businesses/i);
  });

  it('reports a 23503 on a DIFFERENT foreign key instead of 404ing it', async () => {
    // PR #43 review, 🔴. `view_events` has three FKs, so matching 23503 on the
    // SQLSTATE alone answered "shop not found" to a fault that is neither about
    // the shop nor the caller's fault — and reported nothing.
    //
    // Reachable: the admin hard-delete removes the `profiles` row and leaves
    // the auth user, so an orphaned-but-valid JWT trips
    // `view_events_user_id_fkey`.
    mockAuth({
      error: {
        code: '23503',
        message:
          'insert or update on table "view_events" violates foreign key constraint "view_events_user_id_fkey"',
        details:
          'Key (user_id)=(11111111-1111-1111-1111-111111111111) is not present in table "profiles".',
      },
    });

    const res = await POST(makeRequest(), makeParams());

    expect(res.status).toBe(500);
    expect(consoleError).toHaveBeenCalled();
  });

  it('404s a malformed business id without reaching the database', async () => {
    // Otherwise 22P02 becomes a reported 500 on every malformed request.
    const rpc = mockAuth({ error: null });

    const res = await POST(
      new NextRequest(
        'http://localhost/api/mobile/businesses/not-a-uuid/view',
        {
          method: 'POST',
        },
      ),
      { params: Promise.resolve({ businessId: 'not-a-uuid' }) },
    );

    expect(res.status).toBe(404);
    expect(rpc).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('still 500s and reports any other SQLSTATE', async () => {
    // The over-swallow guard: narrowing 23503 must not silence the rest.
    mockAuth({
      error: {
        code: '42P01',
        message: 'relation "view_events" does not exist',
      },
    });

    const res = await POST(makeRequest(), makeParams());

    expect(res.status).toBe(500);
    // `loggedServerError` flattens DB-shaped errors via describeDbError, so
    // the log line carries code + message (details/hint map to undefined).
    expect(consoleError).toHaveBeenCalledWith(
      '[mobile/businesses/[businessId]/view]',
      expect.objectContaining({
        code: '42P01',
        message: 'relation "view_events" does not exist',
      }),
    );
  });

  it('reports a thrown error instead of destroying it', async () => {
    // Regression for the bare `catch {}`. The cause used to be unrecoverable.
    vi.mocked(getMobileUser).mockRejectedValue(
      new Error('token verify failed'),
    );

    const res = await POST(makeRequest(), makeParams());

    expect(res.status).toBe(500);
    expect(consoleError).toHaveBeenCalledWith(
      '[mobile/businesses/[businessId]/view]',
      'token verify failed',
    );
  });

  it('401s an unauthenticated caller without reporting', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(null);

    const res = await POST(makeRequest(), makeParams());

    expect(res.status).toBe(401);
    expect(consoleError).not.toHaveBeenCalled();
  });
});
