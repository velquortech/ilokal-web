import { Masonry } from '@/components/custom/Masonry';
import { Button } from '@/components/ui/button';
import { ChevronDown, Image as ImageIcon } from 'lucide-react';
import { BusinessShop } from '@/providers/BusinessProvider';

interface ShopGalleryProps {
  business?: BusinessShop | null;
}

export function ShopGallery({ business }: ShopGalleryProps) {
  const imageCount = business?.interior_images?.length ?? 0;
  const hasImages = imageCount >= 4;
  const images = hasImages
    ? business!.interior_images.map((src, index) => ({
        src,
        alt: `${business!.shop_name} interior ${index + 1}`,
      }))
    : [];

  return (
    <div className="space-y-4">
      <div className="inline-flex w-full items-center justify-between">
        <span className="font-medium">Explore Shop Gallery</span>
        <Button size="sm">
          See All <ChevronDown />
        </Button>
      </div>
      {hasImages ? (
        <Masonry images={images} unoptimized />
      ) : (
        <div className="border-muted-foreground/25 bg-muted/50 flex h-64 items-center justify-center rounded-xl border border-dashed">
          <div className="text-muted-foreground flex flex-col items-center gap-2">
            <ImageIcon className="size-12 opacity-50" />
            <span className="text-sm">
              {imageCount > 0
                ? `Add ${4 - imageCount} more image${4 - imageCount === 1 ? '' : 's'} to display your gallery`
                : 'No gallery images available'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
