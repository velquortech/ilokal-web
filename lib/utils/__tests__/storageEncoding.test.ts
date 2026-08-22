import { describe, it, expect, vi } from 'vitest';
import {
  decodeStoragePath,
  extractStoragePath,
  publicStorageUrl,
  safeObjectName,
  storagePathsToDelete,
  toStoragePaths,
} from '@/lib/utils/storage';

const BUCKET = 'interior-images';
const HOST = `https://proj.supabase.co/storage/v1/object/public/${BUCKET}`;

/**
 * The exact production values. `OBJECT_NAME` is the object name read out of
 * `storage.objects` on 2026-08-22; `STORED` is what the `businesses` row held
 * for the same file. The gap between them is the whole bug.
 */
const OBJECT_NAME =
  '70490ba4-e8a6-4c27-9f78-9c3ebdd76070/1786278978809-Screenshot 2026-08-08 095928.webp';
const STORED =
  '70490ba4-e8a6-4c27-9f78-9c3ebdd76070/1786278978809-Screenshot%202026-08-08%20095928.webp';

/**
 * Stand-in for `supabase.storage` that reproduces the one behaviour that
 * matters: `getPublicUrl` runs `encodeURI` over the whole url. That is what
 * turns `%20` into `%2520`, and it is why a pre-encoded path 400s.
 */
const storage = {
  from: (bucket: string) => ({
    getPublicUrl: (path: string) => ({
      data: {
        publicUrl: encodeURI(
          `https://proj.supabase.co/storage/v1/object/public/${bucket}/${path}`,
        ),
      },
    }),
  }),
};

describe('decodeStoragePath', () => {
  it('undoes one round of encoding', () => {
    expect(decodeStoragePath(STORED)).toBe(OBJECT_NAME);
  });

  it('leaves a plain path untouched', () => {
    expect(decodeStoragePath('biz/logo-123.webp')).toBe('biz/logo-123.webp');
  });

  it('leaves a bare percent alone rather than throwing', () => {
    // `decodeURIComponent('100%')` throws. A malformed value must come back
    // exactly as stored, not half-rewritten.
    expect(decodeStoragePath('biz/100%.webp')).toBe('biz/100%.webp');
    expect(decodeStoragePath('biz/%zz.webp')).toBe('biz/%zz.webp');
  });

  it('decodes only once, so a genuinely encoded percent survives', () => {
    expect(decodeStoragePath('biz/a%2520b.webp')).toBe('biz/a%20b.webp');
  });
});

describe('publicStorageUrl', () => {
  /**
   * 🔴 The reported bug. Verified by hand against the live bucket:
   * the single-encoded url returns 200, the double-encoded url returns 400.
   */
  it('does not double-encode a path that is already encoded', () => {
    const url = publicStorageUrl(storage, BUCKET, STORED);
    expect(url).not.toContain('%2520');
    expect(url).toBe(`${HOST}/${encodeURI(OBJECT_NAME)}`);
  });

  it('builds the same url from the raw object name', () => {
    expect(publicStorageUrl(storage, BUCKET, OBJECT_NAME)).toBe(
      publicStorageUrl(storage, BUCKET, STORED),
    );
  });

  it('passes an absolute url through untouched', () => {
    // It is already encoded; re-deriving it is how the double-encode gets back
    // in. Also covers the seeded rows, which store absolute urls.
    const absolute = `${HOST}/${encodeURI(OBJECT_NAME)}`;
    expect(publicStorageUrl(storage, BUCKET, absolute)).toBe(absolute);
  });

  it('is null for an absent value', () => {
    expect(publicStorageUrl(storage, BUCKET, null)).toBeNull();
    expect(publicStorageUrl(storage, BUCKET, undefined)).toBeNull();
    expect(publicStorageUrl(storage, BUCKET, '')).toBeNull();
  });

  it('reads the bucket it was given', () => {
    const from = vi.fn(() => ({
      getPublicUrl: () => ({ data: { publicUrl: 'x' } }),
    }));
    publicStorageUrl({ from }, 'shop-logos', 'biz/logo.webp');
    expect(from).toHaveBeenCalledWith('shop-logos');
  });
});

describe('extractStoragePath', () => {
  it('returns the DECODED object name, not the url segment', () => {
    // Returning the encoded segment is how the four production rows were
    // written. `storage.remove()` and `getPublicUrl()` both want the object
    // name, so the decoded form is the only correct answer.
    expect(
      extractStoragePath(`${HOST}/${encodeURI(OBJECT_NAME)}`, BUCKET),
    ).toBe(OBJECT_NAME);
  });

  it('normalises an already-stored encoded path', () => {
    expect(extractStoragePath(STORED, BUCKET)).toBe(OBJECT_NAME);
  });

  it('still returns null for a url outside the bucket', () => {
    expect(
      extractStoragePath('https://evil.example/img/a.webp', BUCKET),
    ).toBeNull();
  });
});

describe('storagePathsToDelete — with encoding in play', () => {
  /**
   * 🔴 IM2: the data-loss half. A registration-written raw path (space intact)
   * and the same file arriving back from the client as a public url must be
   * recognised as ONE file. Before the decode they compared unequal, so the
   * live object was classified as removed and deleted out of the bucket — the
   * exact 2026-08-06 bug, re-opened for any filename containing a space.
   */
  it('does not delete a file whose name contains a space', () => {
    expect(
      storagePathsToDelete(
        [OBJECT_NAME],
        [`${HOST}/${encodeURI(OBJECT_NAME)}`],
        BUCKET,
      ),
    ).toEqual([]);
  });

  it('does not delete a file whose stored path is the encoded form', () => {
    expect(
      storagePathsToDelete(
        [STORED],
        [`${HOST}/${encodeURI(OBJECT_NAME)}`],
        BUCKET,
      ),
    ).toEqual([]);
  });

  it('returns the object name storage.remove() actually takes', () => {
    // A genuine removal must be reported decoded, or the delete silently
    // targets an object that does not exist.
    expect(storagePathsToDelete([STORED], [], BUCKET)).toEqual([OBJECT_NAME]);
  });
});

describe('toStoragePaths', () => {
  it('stores the decoded object name', () => {
    expect(
      toStoragePaths([`${HOST}/${encodeURI(OBJECT_NAME)}`], BUCKET),
    ).toEqual([OBJECT_NAME]);
  });

  it('keeps a foreign value verbatim rather than dropping it', () => {
    const foreign = 'https://cdn.example/photo.webp';
    expect(toStoragePaths([foreign], BUCKET)).toEqual([foreign]);
  });
});

describe('safeObjectName', () => {
  it('removes every character encodeURI would escape', () => {
    const key = safeObjectName('Screenshot 2026-08-08 095928.webp');
    expect(key).toBe('Screenshot-2026-08-08-095928.webp');
    expect(encodeURI(key)).toBe(key);
  });

  it('collapses parens, unicode and repeated separators', () => {
    expect(encodeURI(safeObjectName('images (3).webp'))).toBe(
      safeObjectName('images (3).webp'),
    );
    expect(encodeURI(safeObjectName('café ñandú.webp'))).toBe(
      safeObjectName('café ñandú.webp'),
    );
  });

  it('never produces a traversal-shaped or hidden key', () => {
    expect(safeObjectName('../../etc/passwd')).not.toContain('..');
    expect(safeObjectName('../../etc/passwd').startsWith('.')).toBe(false);
    expect(safeObjectName('.hidden')).toBe('hidden');
  });

  it('falls back rather than returning an empty key', () => {
    expect(safeObjectName('   ')).toBe('file');
    expect(safeObjectName('...')).toBe('file');
  });

  it('leaves an already-safe name alone', () => {
    expect(safeObjectName('logo-1786152582828.webp')).toBe(
      'logo-1786152582828.webp',
    );
  });
});
