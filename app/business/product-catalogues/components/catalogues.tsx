'use client';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { catalogues } from '../../data/products';

export function Catalogues() {
  return (
    <div className="h-full w-sm rounded-md">
      <ToggleGroup type="single" defaultValue="1" variant="outline">
        {catalogues.map((item) => (
          <ToggleGroupItem key={item.id} value={item.id.toString()}>
            {item.name}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
