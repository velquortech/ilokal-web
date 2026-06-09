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
import type { BusinessVerificationStatus } from '@/lib/types/business';

const STATUS_OPTIONS: Array<{
  value: BusinessVerificationStatus | '';
  label: string;
}> = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'suspended', label: 'Suspended' },
];

interface FilterBusinessesProps {
  selectedStatus: string;
  onStatusChange: (status: string) => void;
}

export function FilterBusinesses({
  selectedStatus,
  onStatusChange,
}: FilterBusinessesProps) {
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
            <h4 className="leading-none font-medium">Filter Businesses</h4>
            <p className="text-muted-foreground text-sm">
              Refine by verification status.
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
                    id={`status-${value || 'all'}`}
                  />
                  <label
                    htmlFor={`status-${value || 'all'}`}
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
