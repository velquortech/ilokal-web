import { Masonry } from '@/components/custom/Masonry';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { masonryData } from '../../data/data';

export function ShopGallery() {
  return (
    <div className="space-y-4">
      <div className="inline-flex w-full items-center justify-between">
        <span className="font-medium">Explore Shop Gallery</span>
        <Button size="sm">
          See All <ChevronDown />
        </Button>
      </div>
      <Masonry images={masonryData.images} />
    </div>
  );
}
