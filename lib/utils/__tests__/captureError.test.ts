import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * A scope stack that behaves like Sentry's: `withScope` gives the callback a
 * FRESH scope, and `captureException` reads whatever scope is current. This is
 * what makes the ST8 isolation test meaningful — a mock where `withScope` is
 * just `fn(scope)` with one shared scope object would pass even if the
 * implementation used a global `setUser`, which is the exact bug SN15 feared.
 */
type Scope = {
  setUser: (u: { id: string } | null) => void;
  user?: { id: string } | null;
};

let currentUser: { id: string } | null = null;

const captureException = vi.fn((_error: unknown, _options?: unknown) => {
  // Record the user visible AT CAPTURE TIME, not at assertion time.
  capturedUsers.push(currentUser);
});
const capturedUsers: Array<{ id: string } | null> = [];

const withScope = vi.fn((cb: (scope: Scope) => void) => {
  const previous = currentUser;
  const scope: Scope = {
    setUser: (u) => {
      currentUser = u;
    },
  };
  try {
    cb(scope);
  } finally {
    // A real scope is popped on exit — this is what stops one request's user
    // leaking onto the next event.
    currentUser = previous;
  }
});

vi.mock('@sentry/nextjs', () => ({ captureException, withScope }));

import { captureServerError, logActionError } from '../captureError';

/** The capture is fire-and-forget via a dynamic import — let it settle. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const ORIGINAL_DSN = process.env.SENTRY_DSN;

beforeEach(() => {
  captureException.mockClear();
  withScope.mockClear();
  capturedUsers.length = 0;
  currentUser = null;
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

describe('grouping fingerprint (ST7)', () => {
  beforeEach(() => {
    process.env.SENTRY_DSN = 'https://key@o0.ingest.sentry.io/0';
  });

  const optionsOf = (call: number) =>
    captureException.mock.calls[call][1] as { fingerprint?: string[] };

  it('leaves a real Error on default grouping', async () => {
    // A real stack points at real code and is a better key than anything
    // derivable here.
    captureServerError('someAction', new Error('boom'));
    await flush();
    expect(optionsOf(0).fingerprint).toBeUndefined();
  });

  it('fingerprints a stackless PostgREST error by context and SQLSTATE', async () => {
    // The exact shape that produced the `<anonymous>` issue in production.
    captureServerError('mobile/businesses/[businessId]/view', {
      code: '23503',
      message: 'violates foreign key constraint',
      details: null,
      hint: null,
    });
    await flush();

    expect(optionsOf(0).fingerprint).toEqual([
      'mobile/businesses/[businessId]/view',
      '23503',
    ]);
  });

  it('splits two contexts raising the same SQLSTATE', async () => {
    // Without this they collapse into one issue titled <anonymous>, pointing
    // at captureError.ts rather than at either call site.
    captureServerError('routeA', { code: '42P01' });
    await flush();
    captureServerError('routeB', { code: '42P01' });
    await flush();

    expect(optionsOf(0).fingerprint).not.toEqual(optionsOf(1).fingerprint);
  });

  it('keeps one context and one code as a single group', async () => {
    captureServerError('routeA', { code: '42P01', message: 'first' });
    await flush();
    captureServerError('routeA', { code: '42P01', message: 'second' });
    await flush();

    expect(optionsOf(0).fingerprint).toEqual(optionsOf(1).fingerprint);
  });

  it('falls back to "unknown" when there is no code', async () => {
    captureServerError('routeA', { message: 'no code here' });
    await flush();
    expect(optionsOf(0).fingerprint).toEqual(['routeA', 'unknown']);
  });
});

describe('user attribution (ST8 / SN15)', () => {
  beforeEach(() => {
    process.env.SENTRY_DSN = 'https://key@o0.ingest.sentry.io/0';
  });

  it('attaches nothing when no id is given', async () => {
    captureServerError('someAction', new Error('boom'));
    await flush();

    expect(withScope).not.toHaveBeenCalled();
    expect(capturedUsers).toEqual([null]);
  });

  it('attaches the id when one is given', async () => {
    captureServerError('someAction', new Error('boom'), undefined, 'user-1');
    await flush();

    expect(capturedUsers).toEqual([{ id: 'user-1' }]);
  });

  it('sends the id and nothing else — no email, name or ip', async () => {
    captureServerError('someAction', new Error('boom'), undefined, 'user-1');
    await flush();

    // `sendDefaultPii` is false everywhere; this must not become the hole.
    expect(Object.keys(capturedUsers[0] ?? {})).toEqual(['id']);
  });

  it('does not leak one user onto a later un-attributed event', async () => {
    // THE regression SN15 was deferred over. A bare `Sentry.setUser()` writes
    // to a scope that outlives the call, so the next event inherits the id.
    captureServerError('actionA', new Error('a'), undefined, 'user-1');
    await flush();
    captureServerError('actionB', new Error('b'));
    await flush();

    expect(capturedUsers).toEqual([{ id: 'user-1' }, null]);
  });

  it('keeps two users distinct across successive events', async () => {
    // NOTE for the next person: issuing both captures back-to-back before any
    // flush does NOT work under vitest — its dynamic-import mock resolves only
    // the first, so the second `.then()` never runs. That is a harness
    // artifact, not product behaviour (proven by flushing between the two,
    // which yields both). Don't spend an hour on it again.
    captureServerError('actionA', new Error('a'), undefined, 'user-1');
    await flush();
    captureServerError('actionB', new Error('b'), undefined, 'user-2');
    await flush();

    expect(capturedUsers).toEqual([{ id: 'user-1' }, { id: 'user-2' }]);
  });

  it('cannot interleave, because the scope callback is synchronous', () => {
    // The real concurrency argument, and it is structural rather than timed:
    // `withScope(cb)` runs `cb` synchronously, and `setUser` + `captureException`
    // both happen inside it. JS is single-threaded, so no other event can be
    // captured between those two statements — there is no window for one
    // request's id to land on another's event. A timing test could only ever
    // sample a few interleavings; this rules them all out.
    //
    // If someone later makes that callback `async`, the window opens and this
    // fails.
    let finishedSynchronously = false;
    withScope.mockImplementationOnce((cb: (s: Scope) => void) => {
      const result = cb({ setUser: () => {} }) as unknown;
      finishedSynchronously = !(
        result && typeof (result as { then?: unknown }).then === 'function'
      );
    });

    captureServerError('actionA', new Error('a'), undefined, 'user-1');

    return flush().then(() => {
      expect(withScope).toHaveBeenCalledTimes(1);
      expect(finishedSynchronously).toBe(true);
    });
  });

  it('logActionError forwards an id when given, and omits it otherwise', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    logActionError('actionA', new Error('a'), 'user-9');
    await flush();
    logActionError('actionB', new Error('b'));
    await flush();

    expect(capturedUsers).toEqual([{ id: 'user-9' }, null]);
  });
});
