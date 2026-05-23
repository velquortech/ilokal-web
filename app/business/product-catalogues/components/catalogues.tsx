'use client';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { Category } from '@/lib/types';

interface CataloguesProps {
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

export function Catalogues({
  categories,
  selectedCategory,
  onCategoryChange,
}: CataloguesProps) {
  return (
    <div className="h-full w-sm rounded-md">
      <ToggleGroup
        type="single"
        variant="outline"
        value={selectedCategory}
        onValueChange={onCategoryChange}
      >
        {categories.map((item) => (
          <ToggleGroupItem key={item.id} value={item.id}>
            {item.name}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
