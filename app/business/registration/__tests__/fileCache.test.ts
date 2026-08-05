// @vitest-environment happy-dom

/**
 * The registration wizard's file cache.
 *
 * This exists because the previous implementation could not work: files were
 * base64'd into localStorage, and `interior_images` requires at least FOUR
 * images of up to 2 MB each — ~21 MB of UTF-16 string against a ~5 MB quota. It
 * threw `QuotaExceededError` on every conforming gallery, so the field it was
 * built for never cached once.
 *
 * What has to hold now: a round trip that preserves the file's identity, a hard
 * "never throws" contract (this is a convenience, and it must not be able to
 * break a registration), and per-field keys — the old code wrote each field to
 * its own key and the new store must not merge them.
 *
 * happy-dom ships no IndexedDB, so the store is driven against a minimal fake
 * below AND, in one test, against its genuine absence.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  putFiles,
  getFiles,
  removeFiles,
  clearAllFiles,
  MAX_CACHE_BYTES,
} from '../hooks/fileCache';

/** Fires an IDB-shaped request asynchronously, so handlers can be attached. */
function fireRequest<T>(tx: { oncomplete?: (() => void) | null }, result: T) {
  const request = {
    result,
    onsuccess: null as null | (() => void),
    onerror: null as null | (() => void),
  };
  queueMicrotask(() => {
    request.onsuccess?.();
    tx.oncomplete?.();
  });
  return request;
}

function installFakeIndexedDB(): Map<string, unknown> {
  const data = new Map<string, unknown>();

  const open = () => {
    const request = {
      result: {
        objectStoreNames: { contains: () => true },
        close: () => {},
        transaction: () => {
          const tx: {
            objectStore: () => unknown;
            oncomplete: null | (() => void);
            onabort: null | (() => void);
          } = {
            objectStore: () => objectStore,
            oncomplete: null,
            onabort: null,
          };
          const objectStore = {
            put: (value: unknown, key: string) => {
              data.set(key, value);
              // A real `put` resolves with the KEY; a `delete` resolves with
              // undefined. Both are successes, which is why the store reports
              // transaction health separately from the result.
              return fireRequest(tx, key);
            },
            get: (key: string) => fireRequest(tx, data.get(key)),
            delete: (key: string) => {
              data.delete(key);
              return fireRequest(tx, undefined);
            },
            clear: () => {
              data.clear();
              return fireRequest(tx, undefined);
            },
          };
          return tx;
        },
      },
      onsuccess: null as null | (() => void),
      onerror: null as null | (() => void),
      onblocked: null as null | (() => void),
      onupgradeneeded: null as null | (() => void),
    };
    queueMicrotask(() => request.onsuccess?.());
    return request;
  };

  Object.defineProperty(globalThis, 'indexedDB', {
    value: { open },
    configurable: true,
    writable: true,
  });

  return data;
}

function removeIndexedDB() {
  Object.defineProperty(globalThis, 'indexedDB', {
    value: undefined,
    configurable: true,
    writable: true,
  });
}

const makeFile = (name: string, bytes: number, type = 'image/jpeg') =>
  new File([new Uint8Array(bytes)], name, { type, lastModified: 1234567890 });

let store: Map<string, unknown>;

beforeEach(() => {
  store = installFakeIndexedDB();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fileCache', () => {
  it('round-trips a gallery that localStorage could never have held', async () => {
    // The minimum conforming selection: four 2 MB images. This is the exact
    // payload that threw QuotaExceededError before.
    const files = [1, 2, 3, 4].map((n) =>
      makeFile(`interior-${n}.jpg`, 2 * 1024 * 1024),
    );

    await expect(putFiles('interior_images', files)).resolves.toBe(true);

    const restored = await getFiles('interior_images');
    expect(restored).toHaveLength(4);
    expect(restored.map((f) => f.name)).toEqual([
      'interior-1.jpg',
      'interior-2.jpg',
      'interior-3.jpg',
      'interior-4.jpg',
    ]);
    expect(restored[0].size).toBe(2 * 1024 * 1024);
    expect(restored[0].type).toBe('image/jpeg');
    // The name/type/timestamp survive, so the restored value is the same file
    // as far as the form and the upload route are concerned.
    expect(restored[0].lastModified).toBe(1234567890);
  });

  it('keeps each field on its own key', async () => {
    await putFiles('shop_logo', [makeFile('logo.png', 10, 'image/png')]);
    await putFiles('shop_banner', [makeFile('banner.png', 20, 'image/png')]);

    expect((await getFiles('shop_logo')).map((f) => f.name)).toEqual([
      'logo.png',
    ]);
    expect((await getFiles('shop_banner')).map((f) => f.name)).toEqual([
      'banner.png',
    ]);
  });

  it('replaces a selection rather than merging it', async () => {
    // The caller always passes the field's complete current selection; merging
    // would resurrect images the owner had just removed.
    await putFiles('interior_images', [makeFile('a.jpg', 10)]);
    await putFiles('interior_images', [
      makeFile('b.jpg', 10),
      makeFile('c.jpg', 10),
    ]);

    expect((await getFiles('interior_images')).map((f) => f.name)).toEqual([
      'b.jpg',
      'c.jpg',
    ]);
  });

  it('treats an empty selection as a removal', async () => {
    await putFiles('interior_images', [makeFile('a.jpg', 10)]);
    await putFiles('interior_images', []);

    expect(await getFiles('interior_images')).toEqual([]);
    expect(store.has('interior_images')).toBe(false);
  });

  it('returns an empty list for a field it has never seen', async () => {
    expect(await getFiles('tax_certificate')).toEqual([]);
  });

  it('skips a payload past the cache ceiling, and drops the stale entry', async () => {
    // There is no maximum image COUNT in the schema, only a 2 MB per-file cap,
    // so an owner picking forty photos is representable. Better to cache
    // nothing than to fill the origin's quota.
    await putFiles('interior_images', [makeFile('small.jpg', 10)]);

    const huge = [makeFile('huge.jpg', MAX_CACHE_BYTES + 1)];
    await expect(putFiles('interior_images', huge)).resolves.toBe(false);

    // Not left pointing at the older, smaller selection the owner can no longer
    // see in the form.
    expect(await getFiles('interior_images')).toEqual([]);
    expect(console.warn).toHaveBeenCalled();
  });

  it('removes one field without touching the others', async () => {
    await putFiles('shop_logo', [makeFile('logo.png', 10)]);
    await putFiles('shop_banner', [makeFile('banner.png', 10)]);

    await removeFiles('shop_logo');

    expect(await getFiles('shop_logo')).toEqual([]);
    expect(await getFiles('shop_banner')).toHaveLength(1);
  });

  it('clears everything on a completed registration', async () => {
    await putFiles('shop_logo', [makeFile('logo.png', 10)]);
    await putFiles('interior_images', [makeFile('a.jpg', 10)]);

    await clearAllFiles();

    expect(store.size).toBe(0);
    expect(await getFiles('shop_logo')).toEqual([]);
  });

  it('degrades quietly when IndexedDB is unavailable', async () => {
    // Private-mode browsers block it. The wizard must still work; it simply
    // loses the ability to survive a reload — it must never throw at the form.
    removeIndexedDB();

    await expect(
      putFiles('shop_logo', [makeFile('logo.png', 10)]),
    ).resolves.toBe(false);
    await expect(getFiles('shop_logo')).resolves.toEqual([]);
    await expect(removeFiles('shop_logo')).resolves.toBeUndefined();
    await expect(clearAllFiles()).resolves.toBeUndefined();
  });

  it('degrades quietly when opening the database throws', async () => {
    Object.defineProperty(globalThis, 'indexedDB', {
      value: {
        open: () => {
          throw new Error('access denied');
        },
      },
      configurable: true,
      writable: true,
    });

    await expect(getFiles('shop_logo')).resolves.toEqual([]);
    await expect(
      putFiles('shop_logo', [makeFile('logo.png', 10)]),
    ).resolves.toBe(false);
  });

  it('ignores a stored record whose blob did not survive', async () => {
    // Defensive: an entry written by an older version, or a partially cloned
    // record, must read as "nothing cached" rather than crash the restore.
    store.set('shop_logo', [{ name: 'logo.png', type: 'image/png' }]);

    expect(await getFiles('shop_logo')).toEqual([]);
  });
});
