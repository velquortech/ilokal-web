'use client';

/**
 * Status filter for both event tables.
 *
 * Same `Popover` + `RadioGroup` shape as `FilterProducts` and `FilterCoupons`,
 * fed from `EVENT_STATUS_OPTIONS` rather than literals — so the filter can
 * never offer a status the DB's CHECK rejects, which is exactly how the product
 * catalogue's "Set Status" menu was broken for weeks.
 *
 * The two surfaces disagree about what "no filter" means — the owner's list
 * defaults to everything, the admin queue defaults to `pending_review` and has
 * to say `all` explicitly — so the caller supplies the value for "All".
 */

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
import { EVENT_STATUS_OPTIONS } from '@/lib/types';

interface FilterEventsProps {
  /** The currently selected status, or `allValue` for no filter. */
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  /**
   * What "All" submits. `''` on the owner's list (absent param = everything);
   * `'all'` in the admin queue, where an absent param means `pending_review`.
   */
  allValue?: string;
}

export function FilterEvents({
  selectedStatus,
  onStatusChange,
  allValue = '',
}: FilterEventsProps) {
  const options = [
    { value: allValue, label: 'All' },
    ...EVENT_STATUS_OPTIONS.map(({ value, label }) => ({ value, label })),
  ];

  const filtered = selectedStatus !== allValue;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2">
          <Settings2 className="h-4 w-4" />
          Filter
          {filtered && (
            <span className="bg-primary text-primary-foreground ml-1 rounded-full px-1.5 py-0.5 text-xs leading-none">
              1
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-4" align="end">
        <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="leading-none font-medium">Filter events</h4>
            <p className="text-muted-foreground text-sm">
              Narrow the list by status.
            </p>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              Status
            </Label>
            <RadioGroup value={selectedStatus} onValueChange={onStatusChange}>
              {options.map(({ value, label }) => (
                <div
                  key={value || 'all'}
                  className="flex items-center space-x-2"
                >
                  <RadioGroupItem
                    value={value}
                    id={`event-status-${value || 'all'}`}
                  />
                  <label
                    htmlFor={`event-status-${value || 'all'}`}
                    className="text-sm"
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
            onClick={() => onStatusChange(allValue)}
          >
            Reset
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
