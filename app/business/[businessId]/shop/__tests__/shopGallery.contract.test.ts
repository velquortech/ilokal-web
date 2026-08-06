import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { businessShopGalleryPath } from '@/config/routeConfig';
import {
  businessGallerySchema,
  updateBusinessProfileSchema,
} from '@/lib/validation/business';
import {
  MASONRY_MIN_IMAGES,
  MAX_GALLERY_IMAGES,
  foreignGalleryPaths,
  isOwnGalleryPath,
} from '@/config/gallery';

const ROOT = join(__dirname, '..', '..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
const readRepo = (...segments: string[]) =>
  readFileSync(join(process.cwd(), ...segments), 'utf8');

/**
 * The "must not contain" assertions below run against code with comments
 * stripped: the comments in these files quote the very thing that was removed
 * (that is what makes them worth reading), and a sweep that fails on its own
 * explanation teaches people to delete the explanation.
 */
const code = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const SHOP_GALLERY = read(join('shop', 'components', 'shop-gallery.tsx'));
const SHOP_GALLERY_CODE = code(SHOP_GALLERY);
const MANAGER = read(
  join('shop', 'gallery', 'components', 'GalleryManager.tsx'),
);
// Shared once the gallery page became its second cross-feature importer —
// CLAUDE.md §DRY, the `LocationPicker` precedent.
const UPLOADER = readRepo('components', 'custom', 'GalleryUploader.tsx');
const GALLERY_ACTION = read(join('actions', 'galleryActions.ts'));
const PROFILE_ACTION = read(join('actions', 'profileActions.ts'));

describe('the See All control', () => {
  /**
   * It was a `<Button>` with no `onClick` and no `href` — the primary control
   * on the section, doing nothing. A sweep rather than a render test because
   * the failure mode is an ABSENT attribute, which renders perfectly.
   */
  it('navigates instead of sitting there', () => {
    expect(SHOP_GALLERY).toContain('<Link href={manageHref}>');
    expect(SHOP_GALLERY_CODE).not.toContain('See All');
    // A chevron-down reads as "expand in place", not "go somewhere".
    expect(SHOP_GALLERY_CODE).not.toContain('ChevronDown');
  });

  /**
   * A branch gallery is a different array on a different row
   * (`branches.gallery_images`), edited in the branch editor. Sending an owner
   * who is looking at branch photos to the business gallery would have them
   * edit a set they cannot see.
   */
  it('forks on the same condition that chose the images', () => {
    expect(SHOP_GALLERY).toContain('useBranchGallery && business?.id');
    expect(SHOP_GALLERY).toContain(
      'businessBranchPath(business.id, branch!.id)',
    );
    expect(SHOP_GALLERY).toContain('businessShopGalleryPath(business.id)');
  });

  it('builds the path from routeConfig, never a literal', () => {
    expect(businessShopGalleryPath('abc')).toBe('/business/abc/shop/gallery');
    expect(SHOP_GALLERY_CODE).not.toMatch(/['"]\/business\/[^'"]*gallery/);
  });
});

describe('the gallery page', () => {
  it('reuses the shared uploader rather than growing a second one', () => {
    // Every image surface must call `compressImage`, and none may hand-roll
    // `createImageBitmap`/`toBlob` — the EXIF, animation and alpha traps get
    // solved once or not at all.
    expect(MANAGER).toContain('<GalleryUploader');
    expect(MANAGER).not.toContain('createImageBitmap');
    expect(MANAGER).not.toContain('toBlob');
    expect(MANAGER).not.toContain("fetch('/api/web/upload");
    expect(UPLOADER).toContain('compressImage');
  });

  it('goes through the narrow action, never the whole-profile one', () => {
    expect(MANAGER).toContain('updateBusinessGalleryAction');
    // Reusing this one would erase description, logo, banner and category.
    expect(MANAGER).not.toContain('updateBusinessProfileAction');
  });

  it('tells an outage from an empty gallery', () => {
    expect(MANAGER).toContain('loadFailed');
    expect(MANAGER).toContain('We couldn&apos;t load your gallery');
  });

  it('states both numbers, because they are different numbers', () => {
    expect(MANAGER).toContain('MAX_GALLERY_IMAGES');
    expect(MANAGER).toContain('MASONRY_MIN_IMAGES');
  });
});

describe('the gallery cap is one constant', () => {
  const overCap = Array.from(
    { length: MAX_GALLERY_IMAGES + 1 },
    (_, i) => `https://example.com/${i}.webp`,
  );

  it('is the number the uploader uses', () => {
    // A second literal is how the form starts refusing a photo the server would
    // have accepted, or the reverse.
    expect(UPLOADER).toContain('MAX_GALLERY_IMAGES');
    expect(UPLOADER).not.toMatch(/MAX_IMAGES\s*=\s*\d+/);
  });

  /**
   * 🔴 Nothing caps the gallery at UPLOAD time — registration requires AT LEAST
   * four interior photos and the upload route appends without a ceiling — so a
   * flat cap in either schema rejects every write from a shop that registered
   * with eleven photos, including the removals that would bring it back under.
   * The profile form is worse: it resubmits the whole array, so a flat cap
   * there stops that owner editing their shop NAME. Both actions enforce the
   * cap on GROWTH instead, against the row they just read.
   */
  it('is NOT a flat ceiling on either schema', () => {
    expect(
      businessGallerySchema.safeParse({ interior_images: overCap }).success,
    ).toBe(true);
    expect(
      updateBusinessProfileSchema.safeParse({
        shop_name: 'Cafe',
        interior_images: overCap,
      }).success,
    ).toBe(true);
    for (const source of [GALLERY_ACTION, PROFILE_ACTION]) {
      expect(source).toMatch(/length > MAX_GALLERY_IMAGES/);
      expect(source).toMatch(/length > current\w*\.length/);
    }
  });

  /**
   * 🔴 The gallery action is not the only writer of this column. The guard has
   * to be on BOTH, or the storage-key injection closed on one is simply
   * reachable through the other.
   */
  it('scopes new paths to the shop in every writer of the column', () => {
    for (const source of [GALLERY_ACTION, PROFILE_ACTION]) {
      expect(source).toContain('foreignGalleryPaths(');
    }
  });

  /**
   * `z.string().url()` is backed by `new URL()`, which accepts
   * `javascript:alert(1)` — the trap `urlOrEmpty` was already fixed for. These
   * values are returned by the mobile business-detail route and rendered on
   * public surfaces.
   */
  it.each(['javascript:alert(1)', 'data:text/html,x', 'vbscript:msgbox'])(
    'rejects the %j scheme',
    (entry) => {
      expect(
        businessGallerySchema.safeParse({ interior_images: [entry] }).success,
      ).toBe(false);
    },
  );

  /**
   * The client chooses the strings that reach `storage.remove()`, and the
   * bucket's DELETE policy does not stop a two-shop owner deleting shop B's
   * file through shop A's gallery.
   */
  it('scopes every stored path to the shop that owns it', () => {
    const OWN = '550e8400-e29b-41d4-a716-446655440000';
    expect(isOwnGalleryPath(`${OWN}/a.webp`, OWN)).toBe(true);
    // `verifyBusinessOwner`'s UUID check is `/i` and Postgres compares `uuid`
    // case-insensitively, so an owner who reaches an uppercase URL uploads to
    // an uppercase folder and must still be able to save it.
    expect(isOwnGalleryPath(`${OWN.toUpperCase()}/a.webp`, OWN)).toBe(true);
    for (const bad of [
      'other-shop/a.webp',
      '../shop-logos/a.webp',
      `${OWN}/nested/a.webp`,
      'a.webp',
      `${OWN}/`,
      'https://evil.example/a.webp',
    ]) {
      expect(isOwnGalleryPath(bad, OWN)).toBe(false);
    }
  });

  /**
   * 🔴 Grandfathering is the whole design of `foreignGalleryPaths`. Requiring
   * the shape of EVERY entry would lock the gallery page out of any row that
   * does not already conform — the 40 shops in `bulk_seed.sql` reuse other
   * shops' interior paths, and the sample data in `mobile-api.md` stores
   * foreign picsum URLs. Those owners would have every save refused, including
   * the removal that would fix it.
   */
  it('lets a legacy row stay editable while refusing an injected key', () => {
    const OWN = '550e8400-e29b-41d4-a716-446655440000';
    const legacy = 'some-other-shop/old.webp';

    // Already in the row: kept, and still removable.
    expect(foreignGalleryPaths([legacy], [legacy], OWN)).toEqual([]);
    expect(foreignGalleryPaths([], [legacy], OWN)).toEqual([]);
    expect(
      foreignGalleryPaths([legacy, `${OWN}/new.webp`], [legacy], OWN),
    ).toEqual([]);

    // Newly introduced: refused, and named so the error can say which.
    expect(foreignGalleryPaths(['attacker/x.webp'], [legacy], OWN)).toEqual([
      'attacker/x.webp',
    ]);
  });

  it('keeps the masonry threshold in step with what Masonry enforces', () => {
    expect(readRepo('components', 'custom', 'Masonry.tsx')).toContain(
      `images.length < ${MASONRY_MIN_IMAGES}`,
    );
  });

  it('leaves no local copy of the threshold in the file that branches on it', () => {
    // `shop-gallery.tsx` decides masonry-vs-grid AND prints the "add N more"
    // advice, so a local literal here is the one that can drift from the
    // gallery page's copy of the same sentence.
    expect(SHOP_GALLERY_CODE).toContain('MASONRY_MIN_IMAGES');
    expect(SHOP_GALLERY_CODE).not.toMatch(/MIN_FOR_MASONRY\s*=\s*\d+/);
  });
});
