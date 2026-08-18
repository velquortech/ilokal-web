import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * The limiter keeps its counters in a module-level Map, so every test that
 * spends budget must start from a clean registry or the budgets bleed between
 * cases (the first test to exhaust a key would fail every later one).
 */
async function freshHelper() {
  vi.resetModules();
  return await import('../upload-rate-limit');
}

describe('checkUploadRateLimit', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('allows a caller inside the budget and returns null', async () => {
    const { checkUploadRateLimit } = await freshHelper();
    expect(checkUploadRateLimit('user-1')).toBeNull();
  });

  it('refuses once the budget is spent, with 429 + Retry-After', async () => {
    vi.stubEnv('WEB_UPLOAD_RATE_LIMIT', '3');
    const { checkUploadRateLimit } = await freshHelper();

    expect(checkUploadRateLimit('user-1')).toBeNull();
    expect(checkUploadRateLimit('user-1')).toBeNull();
    expect(checkUploadRateLimit('user-1')).toBeNull();

    const res = checkUploadRateLimit('user-1');
    expect(res).not.toBeNull();
    expect(res!.status).toBe(429);

    const retryAfter = Number(res!.headers.get('Retry-After'));
    expect(retryAfter).toBeGreaterThan(0);
  });

  /**
   * The clients read `.error` off a failed upload
   * (`BannerUploader`: `json.error ?? 'Banner upload failed'`). A `{ message }`
   * body — the shape of the shared `tooManyRequestsResponse` — would render as
   * a generic failure and invite the immediate retry that makes a flood worse.
   */
  it('speaks the { error } shape these routes and their clients use', async () => {
    vi.stubEnv('WEB_UPLOAD_RATE_LIMIT', '1');
    const { checkUploadRateLimit } = await freshHelper();

    checkUploadRateLimit('user-1');
    const res = checkUploadRateLimit('user-1');
    const body = await res!.json();

    expect(typeof body.error).toBe('string');
    expect(body.error.length).toBeGreaterThan(0);
    expect(body.message).toBeUndefined();
  });

  it('budgets each caller separately', async () => {
    vi.stubEnv('WEB_UPLOAD_RATE_LIMIT', '1');
    const { checkUploadRateLimit } = await freshHelper();

    checkUploadRateLimit('user-1');
    expect(checkUploadRateLimit('user-1')).not.toBeNull();

    // A second user is untouched by the first user's exhausted budget.
    expect(checkUploadRateLimit('user-2')).toBeNull();
  });

  /**
   * The property the shared bucket exists for. Six POST doors plus the DELETE
   * all call this helper with the same user id, so rotating between endpoints
   * must NOT buy extra budget — the defect the login door already fixed by
   * sharing `auth:login:*` across its two entrypoints.
   */
  it('does not grant extra budget for calling from a different route', async () => {
    vi.stubEnv('WEB_UPLOAD_RATE_LIMIT', '2');
    const { checkUploadRateLimit } = await freshHelper();

    // Pretend these three calls come from three different upload routes.
    expect(checkUploadRateLimit('owner-1')).toBeNull(); // business-logo
    expect(checkUploadRateLimit('owner-1')).toBeNull(); // business-banner
    expect(checkUploadRateLimit('owner-1')).not.toBeNull(); // product-image
  });

  it('honours the configured window in the Retry-After it reports', async () => {
    vi.stubEnv('WEB_UPLOAD_RATE_LIMIT', '1');
    vi.stubEnv('WEB_UPLOAD_RATE_WINDOW_MS', '120000');
    const { checkUploadRateLimit } = await freshHelper();

    checkUploadRateLimit('user-1');
    const res = checkUploadRateLimit('user-1');

    expect(Number(res!.headers.get('Retry-After'))).toBeGreaterThan(60);
  });
});
