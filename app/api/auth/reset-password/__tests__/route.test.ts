import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  beforeAll,
  afterAll,
} from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { POST } from '@/app/api/auth/reset-password/route';
import {
  createServerAdminClient,
  createServerSupabaseClient,
} from '@/supabase/server';
import { sendResetEmail } from '@/app/api/emails/sendResetEmail';
import { checkAuthRateLimit } from '@/app/api/helpers/auth-rate-limit';

// `after()` runs post-response inside Next's request scope, which a direct
// handler call doesn't provide — run the callback inline so the send is
// observable in tests.
vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();
  return { ...actual, after: (cb: () => unknown) => cb() };
});
vi.mock('@/supabase/server', () => ({
  createServerAdminClient: vi.fn(),
  createServerSupabaseClient: vi.fn(),
}));
vi.mock('@/app/api/emails/sendResetEmail', () => ({
  sendResetEmail: vi.fn(),
}));
vi.mock('@/app/api/helpers/auth-rate-limit', () => ({
  checkAuthRateLimit: vi.fn(() => null),
}));

const mockAdmin = vi.mocked(createServerAdminClient);
const mockCookie = vi.mocked(createServerSupabaseClient);
const mockSend = vi.mocked(sendResetEmail);
const mockLimit = vi.mocked(checkAuthRateLimit);

const APP_URL = 'https://app.ilokal.test';

function post(body: unknown): NextRequest {
  return new NextRequest('https://app.ilokal.test/api/auth/reset-password', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

type AdminClient = Awaited<ReturnType<typeof createServerAdminClient>>;
type CookieClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

function generateLinkMock(result: unknown) {
  const generateLink = vi.fn().mockResolvedValue(result);
  mockAdmin.mockResolvedValue({
    auth: { admin: { generateLink } },
  } as unknown as AdminClient);
  return generateLink;
}

function cookieClientMock({
  verifyError = null,
  updateError = null,
  // Default: no MFA (AAL1 is the required level), so step 1 proceeds straight
  // to updateUser. MFA-path tests override nextLevel to 'aal2'.
  currentLevel = 'aal1',
  nextLevel = 'aal1',
  // Step-2 (MFA code) knobs.
  factors = [{ id: 'factor-1', status: 'verified' }],
  challengeError = null,
}: {
  verifyError?: { message: string } | null;
  updateError?: { message?: string; code?: string } | null;
  currentLevel?: 'aal1' | 'aal2';
  nextLevel?: 'aal1' | 'aal2';
  factors?: Array<{ id: string; status: string }>;
  challengeError?: { message: string } | null;
} = {}) {
  const verifyOtp = vi.fn().mockResolvedValue({ error: verifyError });
  const updateUser = vi.fn().mockResolvedValue({ error: updateError });
  const signOut = vi.fn().mockResolvedValue({ error: null });
  const getAuthenticatorAssuranceLevel = vi
    .fn()
    .mockResolvedValue({ data: { currentLevel, nextLevel } });
  const listFactors = vi.fn().mockResolvedValue({ data: { totp: factors } });
  const challengeAndVerify = vi
    .fn()
    .mockResolvedValue({ error: challengeError });
  mockCookie.mockResolvedValue({
    auth: {
      verifyOtp,
      updateUser,
      signOut,
      mfa: {
        getAuthenticatorAssuranceLevel,
        listFactors,
        challengeAndVerify,
      },
    },
  } as unknown as CookieClient);
  return {
    verifyOtp,
    updateUser,
    signOut,
    getAuthenticatorAssuranceLevel,
    listFactors,
    challengeAndVerify,
  };
}

beforeAll(() => {
  process.env.NEXT_PUBLIC_APP_URL = APP_URL;
});
afterAll(() => {
  delete process.env.NEXT_PUBLIC_APP_URL;
});
beforeEach(() => {
  vi.clearAllMocks();
  mockLimit.mockReturnValue(null);
  mockSend.mockResolvedValue({ sent: true });
});

describe('reset-password — request branch', () => {
  it('sends an email with a token_hash link for an existing account', async () => {
    generateLinkMock({
      data: { properties: { hashed_token: 'HASH123' } },
      error: null,
    });

    const res = await POST(post({ email: 'user@example.com' }));
    expect(res.status).toBe(200);

    expect(mockSend).toHaveBeenCalledTimes(1);
    const arg = mockSend.mock.calls[0][0];
    expect(arg.to).toBe('user@example.com');
    expect(arg.url).toBe(
      `${APP_URL}/reset-password?token_hash=HASH123&type=recovery`,
    );
  });

  it('returns the same generic success for a non-existent account (no enumeration)', async () => {
    generateLinkMock({
      data: { properties: null },
      error: { message: 'User not found' },
    });

    const res = await POST(post({ email: 'ghost@example.com' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('fails closed (generic 200, no send) when NEXT_PUBLIC_APP_URL is unset', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    const generateLink = generateLinkMock({
      data: { properties: { hashed_token: 'HASH123' } },
      error: null,
    });

    const res = await POST(post({ email: 'user@example.com' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    // No link host to trust → never mint/send a link, never even call generateLink.
    expect(generateLink).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();

    process.env.NEXT_PUBLIC_APP_URL = APP_URL;
  });

  it('rejects an invalid email with 400', async () => {
    const res = await POST(post({ email: 'not-an-email' }));
    expect(res.status).toBe(400);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('honors the rate limiter', async () => {
    mockLimit.mockReturnValue(
      NextResponse.json({ error: 'rate' }, { status: 429 }),
    );
    const res = await POST(post({ email: 'user@example.com' }));
    expect(res.status).toBe(429);
  });
});

describe('reset-password — confirm branch', () => {
  const good = { token_hash: 'HASH123', password: 'NewPass1' };

  it('verifies, updates the password, and signs out', async () => {
    const { verifyOtp, updateUser, signOut } = cookieClientMock();

    const res = await POST(post(good));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(verifyOtp).toHaveBeenCalledWith({
      token_hash: 'HASH123',
      type: 'recovery',
    });
    expect(updateUser).toHaveBeenCalledWith({ password: 'NewPass1' });
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('returns 400 for an invalid/expired token', async () => {
    const { updateUser } = cookieClientMock({
      verifyError: { message: 'token expired' },
    });

    const res = await POST(post(good));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('INVALID_TOKEN');
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('returns 500 when the password update fails, but still tears down the recovery session', async () => {
    const { signOut } = cookieClientMock({
      updateError: { message: 'db error' },
    });

    const res = await POST(post(good));
    expect(res.status).toBe(500);
    // signOut must fire even on failure so no working session lingers.
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('rejects a weak password before touching Supabase', async () => {
    const { verifyOtp } = cookieClientMock();

    const res = await POST(post({ token_hash: 'HASH123', password: 'weak' }));
    expect(res.status).toBe(400);
    expect(verifyOtp).not.toHaveBeenCalled();
  });
});

describe('reset-password — MFA (2FA) path', () => {
  const good = { token_hash: 'HASH123', password: 'NewPass1' };
  const codeBody = { password: 'NewPass1', code: '123456' };

  it('step 1: returns mfaRequired without changing the password or ending the session', async () => {
    const { updateUser, signOut } = cookieClientMock({ nextLevel: 'aal2' });

    const res = await POST(post(good));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.mfaRequired).toBe(true);
    // password not changed yet; recovery session kept alive for step 2
    expect(updateUser).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it('step 1: maps an insufficient_aal update error to mfaRequired (safety net)', async () => {
    const { signOut } = cookieClientMock({
      updateError: { code: 'insufficient_aal', message: 'AAL2 required' },
    });

    const res = await POST(post(good));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.mfaRequired).toBe(true);
    // must NOT sign out — the session is needed for the code step
    expect(signOut).not.toHaveBeenCalled();
  });

  it('step 2: verifies the code, updates the password, and signs out', async () => {
    const { challengeAndVerify, updateUser, signOut } = cookieClientMock();

    const res = await POST(post(codeBody));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(challengeAndVerify).toHaveBeenCalledWith({
      factorId: 'factor-1',
      code: '123456',
    });
    expect(updateUser).toHaveBeenCalledWith({ password: 'NewPass1' });
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('step 2: wrong code → 400 INVALID_CODE, password untouched', async () => {
    const { updateUser } = cookieClientMock({
      challengeError: { message: 'invalid code' },
    });

    const res = await POST(post(codeBody));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('INVALID_CODE');
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('step 2: no verified factor / lost session → 400 SESSION_EXPIRED', async () => {
    const { challengeAndVerify } = cookieClientMock({ factors: [] });

    const res = await POST(post(codeBody));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('SESSION_EXPIRED');
    expect(challengeAndVerify).not.toHaveBeenCalled();
  });

  it('step 2: rejects a weak password before touching Supabase', async () => {
    const { listFactors } = cookieClientMock();

    const res = await POST(post({ password: 'weak', code: '123456' }));
    expect(res.status).toBe(400);
    expect(listFactors).not.toHaveBeenCalled();
  });

  it('step 2: rejects a malformed code', async () => {
    const { listFactors } = cookieClientMock();

    const res = await POST(post({ password: 'NewPass1', code: '12' }));
    expect(res.status).toBe(400);
    expect(listFactors).not.toHaveBeenCalled();
  });
});
