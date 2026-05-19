'use client';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { Category } from '@/lib/types';

interface CataloguesProps {
  categories: Category[];
}

export function Catalogues({ categories }: CataloguesProps) {
  return (
    <div className="h-full w-sm rounded-md">
      <ToggleGroup type="single" variant="outline">
        {categories.map((item) => (
          <ToggleGroupItem key={item.id} value={item.id}>
            {item.name}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
