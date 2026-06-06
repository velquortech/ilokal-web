'use client';

import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { DayKey, OperatingHours, OperatingHoursDay } from '@/lib/types';

const DAY_LABELS: Record<DayKey, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

const DAYS: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const DEFAULT_HOURS: OperatingHours = Object.fromEntries(
  DAYS.map((d) => [d, { open: '09:00', close: '18:00', closed: false }]),
) as OperatingHours;

interface OperatingHoursFormProps {
  value: OperatingHours;
  onChange: (v: OperatingHours) => void;
}

export function OperatingHoursForm({
  value,
  onChange,
}: OperatingHoursFormProps) {
  function updateDay(day: DayKey, patch: Partial<OperatingHoursDay>) {
    onChange({ ...value, [day]: { ...value[day], ...patch } });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-muted-foreground grid grid-cols-[120px_1fr_1fr_auto] items-center gap-2 px-1 text-xs font-medium">
        <span>Day</span>
        <span>Opens</span>
        <span>Closes</span>
        <span>Closed</span>
      </div>
      {DAYS.map((day) => {
        const entry = value[day];
        return (
          <div
            key={day}
            className="grid grid-cols-[120px_1fr_1fr_auto] items-center gap-2"
          >
            <Label className="text-sm font-medium">{DAY_LABELS[day]}</Label>
            <Input
              type="time"
              value={entry.closed ? '' : (entry.open ?? '')}
              disabled={entry.closed}
              onChange={(e) => updateDay(day, { open: e.target.value })}
              className="h-8 text-sm"
            />
            <Input
              type="time"
              value={entry.closed ? '' : (entry.close ?? '')}
              disabled={entry.closed}
              onChange={(e) => updateDay(day, { close: e.target.value })}
              className="h-8 text-sm"
            />
            <Switch
              checked={entry.closed}
              onCheckedChange={(checked) => updateDay(day, { closed: checked })}
              aria-label={`${DAY_LABELS[day]} closed`}
            />
          </div>
        );
      })}
    </div>
  );
}
