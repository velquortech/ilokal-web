import { Masonry } from '@/components/custom/Masonry';
import { Button } from '@/components/ui/button';
import { ChevronDown, Image as ImageIcon } from 'lucide-react';
import { BusinessShop } from '@/providers/BusinessProvider';
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

  const MIN_FOR_MASONRY = 4;
  const hasImages = rawImages.length >= MIN_FOR_MASONRY;
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

  return (
    <div className="space-y-4">
      <div className="inline-flex w-full items-center justify-between">
        <span className="font-medium">{label}</span>
        {hasAnyImages && (
          <Button size="sm">
            See All <ChevronDown />
          </Button>
        )}
      </div>

      {hasImages ? (
        <Masonry images={images} unoptimized />
      ) : hasAnyImages ? (
        // 1–3 images: simple row grid
        <div className="grid grid-cols-3 gap-3">
          {rawImages.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt={`Photo ${i + 1}`}
              className="aspect-video w-full rounded-xl object-cover"
            />
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
                  ? `Add ${MIN_FOR_MASONRY - rawImages.length} more image${MIN_FOR_MASONRY - rawImages.length === 1 ? '' : 's'} to display your gallery`
                  : 'No gallery images available'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
