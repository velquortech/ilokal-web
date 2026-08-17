import { describe, it, expect, vi, afterEach } from 'vitest';
import { loggedServerError } from '../response';

const ORIGINAL_DSN = process.env.SENTRY_DSN;

afterEach(() => {
  if (ORIGINAL_DSN === undefined) delete process.env.SENTRY_DSN;
  else process.env.SENTRY_DSN = ORIGINAL_DSN;
  vi.restoreAllMocks();
});

describe('loggedServerError', () => {
  it('flattens a PostgREST error instead of logging {}', () => {
    // PostgrestError carries its fields NON-enumerably, so console.error(err)
    // renders `{}`. Build one faithfully and assert the line carries the
    // readable fields — the same describeDbError shape logActionError uses.
    delete process.env.SENTRY_DSN;
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = Object.create(null);
    Object.defineProperties(error, {
      code: { value: '23503', enumerable: false },
      message: { value: 'violates foreign key constraint', enumerable: false },
      details: {
        value: 'Key (business_id)=(9) is not present',
        enumerable: false,
      },
      hint: { value: null, enumerable: false },
    });

    loggedServerError('mobile/products', error);

    // describeDbError maps null hint to undefined (which toEqual ignores).
    expect(spy).toHaveBeenCalledWith('[mobile/products]', {
      code: '23503',
      message: 'violates foreign key constraint',
      details: 'Key (business_id)=(9) is not present',
    });
  });

  it('keeps the legacy [context] message shape for a real Error', () => {
    // Only the string message is logged — the shape people grep for. The raw
    // Error object is NOT passed to console.error.
    delete process.env.SENTRY_DSN;
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('boom');

    loggedServerError('mobile/events', error);

    expect(spy).toHaveBeenCalledWith('[mobile/events]', 'boom');
  });

  it('flattens a DB-shaped object that has only a code', () => {
    // An object with no string message used to log NOTHING — a 500 with no
    // reason in the log stream. The flattening surfaces it instead.
    delete process.env.SENTRY_DSN;
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    loggedServerError('mobile/deals', { code: '42P01' });

    expect(spy).toHaveBeenCalledWith('[mobile/deals]', {
      code: '42P01',
      message: '[object Object]',
    });
  });

  it('logs nothing when there is no message to show', () => {
    delete process.env.SENTRY_DSN;
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    loggedServerError('mobile/deals', undefined);
    loggedServerError('mobile/deals', 'a bare string');

    expect(spy).not.toHaveBeenCalled();
  });

  it('returns a generic 500, never the driver error', () => {
    delete process.env.SENTRY_DSN;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = {
      code: '42P01',
      message: 'relation "secret_table" does not exist',
    };

    const res = loggedServerError('mobile/deals', error);

    expect(res.status).toBe(500);
    void res.json().then((body) => {
      expect(body).toEqual({ message: 'General Error' });
      expect(JSON.stringify(body)).not.toContain('secret_table');
    });
  });
});
