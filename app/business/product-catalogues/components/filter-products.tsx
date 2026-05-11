'use client';

import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

const STATUS_OPTIONS = ['active', 'disabled', 'unlisted'] as const;
const BADGE_OPTIONS = ['Limited Offer', 'Bestseller', 'New', 'Popular'];

export function FilterProducts() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2">
          <Settings2 className="h-4 w-4" />
          Filter Products
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="end">
        <div className="space-y-4">
          {/* Header */}
          <div className="space-y-1">
            <h4 className="leading-none font-medium">Filters</h4>
            <p className="text-muted-foreground text-sm">
              Refine the product list view.
            </p>
          </div>

          <Separator />

          {/* Filter by Status */}
          <div className="space-y-3">
            <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              Availability Status
            </Label>
            <div className="grid gap-2">
              {STATUS_OPTIONS.map((status) => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox id={`status-${status}`} />
                  <label
                    htmlFor={`status-${status}`}
                    className="text-sm leading-none font-medium capitalize peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {status}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Filter by Special Attributes */}
          <div className="space-y-3">
            <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              Offers & Badges
            </Label>
            <div className="flex flex-wrap gap-2">
              <div className="flex w-full items-center space-x-2">
                <Checkbox id="on-sale" />
                <label htmlFor="on-sale" className="text-sm font-medium">
                  On Sale Only
                </label>
              </div>
              {BADGE_OPTIONS.map((badge) => (
                <Badge
                  key={badge}
                  variant="secondary"
                  className="hover:bg-primary hover:text-primary-foreground cursor-pointer transition-colors"
                >
                  {badge}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex justify-between gap-2 pt-2">
            <Button variant="ghost" size="sm" className="h-8 text-xs">
              Reset
            </Button>
            <Button size="sm" className="h-8 px-4 text-xs">
              Apply Filters
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
