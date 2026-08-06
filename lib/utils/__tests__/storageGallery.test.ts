import { describe, it, expect } from 'vitest';
import { storagePathsToDelete, toStoragePaths } from '@/lib/utils/storage';

const BUCKET = 'interior-images';
const HOST = `https://proj.supabase.co/storage/v1/object/public/${BUCKET}`;

describe('storagePathsToDelete', () => {
  it('returns what left the list', () => {
    expect(
      storagePathsToDelete(
        ['biz/a.webp', 'biz/b.webp'],
        ['biz/a.webp'],
        BUCKET,
      ),
    ).toEqual(['biz/b.webp']);
  });

  /**
   * 🔴 The bug this function exists for. One column holds two representations
   * of the same file: registration writes the raw path `storage.upload()`
   * returns, the upload route and every later save write the absolute public
   * URL, and the read layer resolves paths to URLs — so the client always sends
   * URLs back. Comparing those strings directly matched nothing, marked every
   * registration-uploaded photo as removed, and deleted the owner's whole
   * gallery out of the bucket on their first save.
   */
  it('does not treat a raw path and its own public URL as different files', () => {
    expect(
      storagePathsToDelete(
        ['biz/a.webp', 'biz/b.webp'],
        [`${HOST}/biz/a.webp`, `${HOST}/biz/b.webp`],
        BUCKET,
      ),
    ).toEqual([]);
  });

  it('still finds the one genuine removal among mixed representations', () => {
    expect(
      storagePathsToDelete(
        ['biz/a.webp', `${HOST}/biz/b.webp`, 'biz/c.webp'],
        [`${HOST}/biz/a.webp`, 'biz/c.webp'],
        BUCKET,
      ),
    ).toEqual(['biz/b.webp']);
  });

  it('drops entries it cannot resolve to this bucket rather than deleting them', () => {
    // A foreign host normalises to null. Deleting on a guess is how a value we
    // failed to parse becomes a file we destroyed.
    expect(
      storagePathsToDelete(['https://example.com/photo.jpg'], [], BUCKET),
    ).toEqual([]);
  });

  it('deduplicates', () => {
    expect(
      storagePathsToDelete(['biz/a.webp', `${HOST}/biz/a.webp`], [], BUCKET)
        .length,
    ).toBe(1);
  });

  it('is empty when nothing changed and when the gallery grew', () => {
    expect(
      storagePathsToDelete(['biz/a.webp'], ['biz/a.webp'], BUCKET),
    ).toEqual([]);
    expect(
      storagePathsToDelete(
        ['biz/a.webp'],
        ['biz/a.webp', 'biz/b.webp'],
        BUCKET,
      ),
    ).toEqual([]);
  });
});

describe('toStoragePaths', () => {
  it('strips the public prefix', () => {
    expect(toStoragePaths([`${HOST}/biz/a.webp`], BUCKET)).toEqual([
      'biz/a.webp',
    ]);
  });

  it('leaves an already-relative path alone', () => {
    expect(toStoragePaths(['biz/a.webp'], BUCKET)).toEqual(['biz/a.webp']);
  });

  it('keeps a value it cannot parse rather than dropping it', () => {
    // The gallery is the owner's data; silently discarding an entry is worse
    // than storing a string we could not shorten.
    expect(toStoragePaths(['https://example.com/photo.jpg'], BUCKET)).toEqual([
      'https://example.com/photo.jpg',
    ]);
  });

  it('preserves order', () => {
    expect(
      toStoragePaths([`${HOST}/biz/b.webp`, `${HOST}/biz/a.webp`], BUCKET),
    ).toEqual(['biz/b.webp', 'biz/a.webp']);
  });
});
