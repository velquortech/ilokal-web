import { Masonry } from '@/components/custom/Masonry';
import { Button } from '@/components/ui/button';
import { ArrowRight, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { BusinessShop } from '@/providers/BusinessProvider';
import {
  businessBranchPath,
  businessShopGalleryPath,
} from '@/config/routeConfig';
import { MASONRY_MIN_IMAGES } from '@/lib/validation/business';
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
      <div className="inline-flex w-full items-center justify-between">
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
        // 1–3 images: simple row grid
        <div className="grid grid-cols-3 gap-3">
          {rawImages.map((src, i) => (
            <div
              key={i}
              className="relative aspect-video w-full overflow-hidden rounded-xl"
            >
              <Image
                src={src}
                alt={`Photo ${i + 1}`}
                fill
                loading="lazy"
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </div>
          ))}
        </div>
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
