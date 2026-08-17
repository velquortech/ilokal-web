/**
 * Every storage image must load directly — never through the optimizer — and
 * must degrade to a placeholder when it fails to load.
 *
 * Display images (shop logo/banner, interiors, products, events, avatars,
 * branch photos) are converted to WebP at WRITE time (`lib/api/helpers/image.ts`
 * → `convertToWebP`), and the free Supabase plan has no on-the-fly transform
 * endpoint. Routing one of those URLs through Next's `/_next/image` proxy makes
 * the optimizer fetch the file itself, which that plan cannot serve — the
 * browser gets a 400 and the image renders broken, while the mobile app (which
 * requests the URL directly) shows it fine. That exact symptom is why this rule
 * exists: a newly uploaded logo/banner appeared on phones but broke the webapp.
 *
 * The second half is the broken-image fallback: a URL that RESOLVES but no
 * longer exists (or is blocked) otherwise renders the browser's broken glyph in
 * every card and logo container.
 *
 * Both rules live in ONE component — `components/custom/SafeImage.tsx` — which
 * forces `unoptimized` and swaps to `BrokenImage` on error. Every surface below
 * must render through it: no raw `next/image` may exist outside `SafeImage`,
 * so a new card cannot reintroduce either regression by omission.
 *
 * This is a source-scan contract test because there is no runtime seam that
 * catches the regression: in dev `images.unoptimized` is globally true, so the
 * optimizer is never consulted and everything renders — the failure only exists
 * in a production build, with a remote host, and a real upload.
 *
 * `blob:` / `data:` previews (registration wizard, branch wizard, the MFA QR)
 * are exempt: they are in-memory or inline and cannot fail, and next/image
 * forces those unoptimized internally anyway.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

/**
 * Every surface that renders a Supabase storage image. Each must render
 * through `SafeImage` (the single owner of the `unoptimized` + fallback rules).
 */
const STORAGE_IMAGE_SURFACES = [
  // Shop identity — logo + banner on the owner's shop page and the public one.
  'app/business/[businessId]/shop/components/shop-banner.tsx',
  'app/explore/[businessId]/page.tsx',
  // Explore directory.
  'app/explore/components/business-card.tsx',
  'app/explore/components/deal-card.tsx',
  'app/explore/nearby/components/nearby-content.tsx',
  // Customer surfaces.
  'app/customer/following/page.tsx',
  'app/customer/wallet/components/redemption-card.tsx',
  // Galleries + lightbox. `Masonry` and `interior-gallery` render through
  // `NaturalRatioGallery` (which renders through `SafeImage`), so only the
  // shared components are listed.
  'components/custom/NaturalRatioGallery.tsx',
  'components/custom/ImageLightbox.tsx',
  'app/business/[businessId]/shop/components/shop-gallery.tsx',
  // Product cards + table.
  'components/custom/ProductCard.tsx',
  'app/explore/[businessId]/components/product-card.tsx',
  'app/business/[businessId]/product-catalogues/components/product-table/columns.tsx',
  // Events.
  'app/events/[eventId]/page.tsx',
  'app/events/components/event-card.tsx',
  'app/explore/components/event-banner.tsx',
  'components/custom/events/EventCells.tsx',
  // Branch photos.
  'app/business/[businessId]/branches/components/branch-card.tsx',
  'app/business/[businessId]/branches/components/edit-branch.tsx',
  'app/business/[businessId]/branches/[branchId]/components/branch-detail-content.tsx',
  // Avatars.
  'components/custom/AvatarImage.tsx',
  // Uploaders (their stored-URL previews).
  'components/custom/GalleryUploader.tsx',
  'components/custom/upload/image-upload.tsx',
  'app/business/[businessId]/profile/components/LogoUploader.tsx',
  'app/business/[businessId]/profile/components/BannerUploader.tsx',
  'components/custom/Nav.tsx',
];

/** One self-closing `<Image … />` block, including its props. */
const IMAGE_BLOCKS = /<Image\b[\s\S]*?\/>/g;

describe('storage images load directly (unoptimized)', () => {
  // SafeImage — the single owner — must carry both rules on its own <Image>.
  describe('components/custom/SafeImage.tsx', () => {
    const source = read('components/custom/SafeImage.tsx');
    const blocks = source.match(IMAGE_BLOCKS) ?? [];

    it('has one next/image to guard', () => {
      expect(blocks.length).toBeGreaterThan(0);
    });

    it('forces unoptimized', () => {
      for (const block of blocks) {
        expect(block).toMatch(/\bunoptimized\b/);
      }
    });

    it('wires onError to the broken-image fallback', () => {
      for (const block of blocks) {
        expect(block).toMatch(/\bonError=/);
      }
    });
  });

  for (const file of STORAGE_IMAGE_SURFACES) {
    describe(file, () => {
      const source = read(file);

      it('renders storage images through SafeImage', () => {
        expect(
          source,
          `no <SafeImage> — render through the shared component so the ` +
            `unoptimized + broken-image fallback rules can't be skipped ` +
            `(see components/custom/SafeImage.tsx)`,
        ).toContain('SafeImage');
      });

      it('has no raw <Image> outside SafeImage', () => {
        const rawDynamic = (source.match(IMAGE_BLOCKS) ?? []).filter((block) =>
          /\bsrc=\{/.test(block),
        );
        expect(
          rawDynamic,
          `raw <Image> with a dynamic src — pass it through SafeImage:\n${indent(
            rawDynamic.join('\n'),
          )}`,
        ).toEqual([]);
      });
    });
  }
});

function indent(block: string): string {
  return block
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n');
}
