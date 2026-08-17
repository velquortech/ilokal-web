import { Masonry } from '@/components/custom/Masonry';
import { NaturalRatioGallery } from '@/components/custom/NaturalRatioGallery';
import { SafeImage } from '@/components/custom/SafeImage';
import { Button } from '@/components/ui/button';
import { ArrowRight, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { BusinessShop } from '@/providers/BusinessProvider';
import {
  businessBranchPath,
  businessShopGalleryPath,
} from '@/config/routeConfig';
import { MASONRY_MIN_IMAGES } from '@/config/gallery';
import type { Branch } from '@/lib/types';

interface ShopGalleryProps {
  business?: BusinessShop | null;
  branch?: Branch | null;
}

export function ShopGallery({ business, branch }: ShopGalleryProps) {
  // Branch gallery takes priority when a branch is selected
  const branchGallery = branch?.gallery_images ?? [];
  const useBranchGallery = branch && branchGallery.length > 0;

  const rawImages = useBranchGallery
    ? branchGallery
    : (business?.interior_images ?? []);

  const label = useBranchGallery
    ? `${branch!.name} Gallery`
    : 'Explore Shop Gallery';

  const hasImages = rawImages.length >= MASONRY_MIN_IMAGES;
  const images = hasImages
    ? rawImages.map((src, index) => ({
        src,
        alt: useBranchGallery
          ? `${branch!.name} photo ${index + 1}`
          : `${business?.shop_name ?? 'Shop'} interior ${index + 1}`,
      }))
    : [];

  // Show a simple grid for 1–3 images (no masonry minimum needed)
  const hasAnyImages = rawImages.length > 0;

  /**
   * Where "Manage photos" goes has to fork on the SAME condition that chose the
   * images above. A branch gallery is a different array on a different row
   * (`branches.gallery_images`), edited in the branch editor — sending an owner
   * looking at their branch photos to the business gallery would have them edit
   * a set they cannot see.
   */
  const manageHref =
    useBranchGallery && business?.id
      ? businessBranchPath(business.id, branch!.id)
      : business?.id
        ? businessShopGalleryPath(business.id)
        : null;

  return (
    <div className="space-y-4">
      {/* `flex-wrap`: a long label (branch name gallery) and the manage
          button used to sit on one unbreakable line and squeeze on a phone;
          below ~360px they wrap instead. */}
      <div className="flex w-full flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{label}</span>
        {manageHref && (
          <Button size="sm" asChild>
            {/* Was a handler-less `<Button>` with a ChevronDown — a control that
                did nothing, wearing a disclosure icon while promising
                navigation. */}
            <Link href={manageHref}>
              {hasAnyImages ? 'Manage photos' : 'Add photos'}
              <ArrowRight />
            </Link>
          </Button>
        )}
      </div>

      {hasImages ? (
        <Masonry images={images} />
      ) : hasAnyImages ? (
        // 1–3 images: natural-ratio columns — every photo keeps its own aspect
        // (nothing is cropped into a fixed frame), 2-up on a phone and 3-up
        // from `sm`. A single image renders at its natural size, centered and
        // height-capped so a very tall portrait can't dominate the page.
        rawImages.length === 1 ? (
          // SafeImage: unoptimized storage WebP + broken-image fallback (a
          // deleted photo shows the placeholder instead of the broken glyph).
          <SafeImage
            src={rawImages[0]}
            alt="Photo 1"
            width={0}
            height={0}
            loading="lazy"
            className="mx-auto h-auto max-h-[70vh] w-auto max-w-full rounded-xl"
            fallbackClassName="mx-auto my-4 min-h-40 max-w-full rounded-xl"
          />
        ) : (
          // Default columns: 2-up on a phone, 3-up from `sm`.
          <NaturalRatioGallery
            images={rawImages.map((src, i) => ({
              src,
              alt: `Photo ${i + 1}`,
            }))}
          />
        )
      ) : (
        <div className="border-muted-foreground/25 bg-muted/50 flex h-64 items-center justify-center rounded-xl border border-dashed">
          <div className="text-muted-foreground flex flex-col items-center gap-2">
            <ImageIcon className="size-12 opacity-50" />
            <span className="text-sm">
              {useBranchGallery
                ? 'No gallery photos for this branch yet'
                : rawImages.length > 0
                  ? `Add ${MASONRY_MIN_IMAGES - rawImages.length} more image${MASONRY_MIN_IMAGES - rawImages.length === 1 ? '' : 's'} to display your gallery`
                  : 'No gallery images available'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
