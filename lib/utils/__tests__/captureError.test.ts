import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const captureException = vi.fn();
vi.mock('@sentry/nextjs', () => ({ captureException }));

import { captureServerError, logActionError } from '../captureError';

/** The capture is fire-and-forget via a dynamic import — let it settle. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const ORIGINAL_DSN = process.env.SENTRY_DSN;

beforeEach(() => {
  captureException.mockClear();
});

afterEach(() => {
  if (ORIGINAL_DSN === undefined) delete process.env.SENTRY_DSN;
  else process.env.SENTRY_DSN = ORIGINAL_DSN;
  vi.restoreAllMocks();
});

describe('captureServerError without a DSN', () => {
  beforeEach(() => {
    delete process.env.SENTRY_DSN;
  });

  it('never touches the SDK', async () => {
    captureServerError('someContext', new Error('boom'));
    await flush();
    expect(captureException).not.toHaveBeenCalled();
  });

  it('does not throw', () => {
    expect(() => captureServerError('c', new Error('boom'))).not.toThrow();
  });
});

describe('captureServerError with a DSN', () => {
  beforeEach(() => {
    process.env.SENTRY_DSN = 'https://key@o0.ingest.sentry.io/0';
  });

  it('reports a real error, tagged with its context', async () => {
    const error = new Error('boom');
    captureServerError('createProductAction', error);
    await flush();

    expect(captureException).toHaveBeenCalledTimes(1);
    const [reported, options] = captureException.mock.calls[0] as [
      unknown,
      { tags: { context: string }; level: string },
    ];
    expect(reported).toBe(error);
    expect(options.tags.context).toBe('createProductAction');
    expect(options.level).toBe('error');
  });

  it('forwards extra context only when given', async () => {
    captureServerError('a', new Error('x'), { businessId: 'b-1' });
    await flush();
    const [, withExtra] = captureException.mock.calls[0] as [
      unknown,
      { extra?: Record<string, unknown> },
    ];
    expect(withExtra.extra).toEqual({ businessId: 'b-1' });

    captureException.mockClear();
    captureServerError('a', new Error('x'));
    await flush();
    const [, without] = captureException.mock.calls[0] as [
      unknown,
      { extra?: Record<string, unknown> },
    ];
    expect(without.extra).toBeUndefined();
  });

  it('drops a redirect, which actions routinely catch', async () => {
    // Every `redirect()` in the app throws one of these. Unfiltered they would
    // outnumber real errors.
    captureServerError('signInAction', {
      digest: 'NEXT_REDIRECT;replace;/business',
    });
    await flush();
    expect(captureException).not.toHaveBeenCalled();
  });

  it('drops notFound() and aborted requests', async () => {
    captureServerError('a', { digest: 'NEXT_HTTP_ERROR_FALLBACK;404' });
    const aborted = new Error('aborted');
    aborted.name = 'AbortError';
    captureServerError('a', aborted);
    await flush();
    expect(captureException).not.toHaveBeenCalled();
  });

  it('ignores null and undefined', async () => {
    captureServerError('a', null);
    captureServerError('a', undefined);
    await flush();
    expect(captureException).not.toHaveBeenCalled();
  });
});

describe('logActionError', () => {
  it('logs in exactly the shape it replaced', () => {
    // The console line is what people grep in a log stream; adding monitoring
    // must not have changed it.
    delete process.env.SENTRY_DSN;
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('boom');

    logActionError('createProductAction', error);

    expect(spy).toHaveBeenCalledWith('[createProductAction]', error);
  });

  it('reports as well as logs', async () => {
    process.env.SENTRY_DSN = 'https://key@o0.ingest.sentry.io/0';
    vi.spyOn(console, 'error').mockImplementation(() => {});

    logActionError('updateCouponAction', new Error('boom'));
    await flush();

    expect(captureException).toHaveBeenCalledTimes(1);
  });

  it('still logs a redirect it will not report', async () => {
    // The log is unconditional; only the reporting is filtered.
    process.env.SENTRY_DSN = 'https://key@o0.ingest.sentry.io/0';
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const redirect = { digest: 'NEXT_REDIRECT;replace;/x' };

    logActionError('someAction', redirect);
    await flush();

    expect(spy).toHaveBeenCalledWith('[someAction]', redirect);
    expect(captureException).not.toHaveBeenCalled();
  });
});
