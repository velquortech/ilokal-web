import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { businessShopGalleryPath } from '@/config/routeConfig';
import {
  MASONRY_MIN_IMAGES,
  MAX_GALLERY_IMAGES,
  businessGallerySchema,
  updateBusinessProfileSchema,
} from '@/lib/validation/business';

const ROOT = join(__dirname, '..', '..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

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
const UPLOADER = read(join('profile', 'components', 'GalleryUploader.tsx'));

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

  /**
   * The delete here is immediate AND removes the file from storage, unlike the
   * profile form's staged removal.
   */
  it('confirms before a destructive removal', () => {
    expect(MANAGER).toContain('onRequestRemove={setConfirmRemove}');
    expect(MANAGER).toContain('<DialogTitle>Remove this photo?</DialogTitle>');
    expect(MANAGER).toContain('variant="destructive"');
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
  it('is shared by both schemas and by the uploader', () => {
    const overCap = Array.from(
      { length: MAX_GALLERY_IMAGES + 1 },
      (_, i) => `https://example.com/${i}.webp`,
    );
    expect(
      businessGallerySchema.safeParse({ interior_images: overCap }).success,
    ).toBe(false);
    expect(
      updateBusinessProfileSchema.safeParse({
        shop_name: 'Cafe',
        interior_images: overCap,
      }).success,
    ).toBe(false);
    // A second literal is how the form starts refusing a photo the server would
    // have accepted, or the reverse.
    expect(UPLOADER).toContain('MAX_GALLERY_IMAGES');
    expect(UPLOADER).not.toMatch(/MAX_IMAGES\s*=\s*\d+/);
  });

  it('keeps the masonry threshold in step with what Masonry enforces', () => {
    const masonry = readFileSync(
      join(process.cwd(), 'components', 'custom', 'Masonry.tsx'),
      'utf8',
    );
    expect(masonry).toContain(`images.length < ${MASONRY_MIN_IMAGES}`);
  });
});
