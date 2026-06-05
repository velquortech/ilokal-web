'use client';

import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { RedemptionStatus } from '@/lib/types';

const STATUS_OPTIONS: Array<{ value: RedemptionStatus | ''; label: string }> = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'claimed', label: 'Claimed' },
  { value: 'expired', label: 'Expired' },
];

interface FilterRedemptionsProps {
  selectedStatus: string;
  onStatusChange: (status: string) => void;
}

export function FilterRedemptions({
  selectedStatus,
  onStatusChange,
}: FilterRedemptionsProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2">
          <Settings2 className="h-4 w-4" />
          Filter
          {selectedStatus && (
            <span className="bg-primary text-primary-foreground ml-1 rounded-full px-1.5 py-0.5 text-xs leading-none">
              1
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-4" align="end">
        <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="leading-none font-medium">Filter Redemptions</h4>
            <p className="text-muted-foreground text-sm">
              Refine the redemptions list.
            </p>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              Status
            </Label>
            <RadioGroup value={selectedStatus} onValueChange={onStatusChange}>
              {STATUS_OPTIONS.map(({ value, label }) => (
                <div
                  key={value || 'all'}
                  className="flex items-center space-x-2"
                >
                  <RadioGroupItem
                    value={value}
                    id={`redemption-status-${value || 'all'}`}
                  />
                  <label
                    htmlFor={`redemption-status-${value || 'all'}`}
                    className="text-sm capitalize"
                  >
                    {label}
                  </label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <Separator />

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-full text-xs"
            onClick={() => onStatusChange('')}
          >
            Reset
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
