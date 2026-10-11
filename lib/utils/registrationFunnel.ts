import type { FunnelCounts } from '@/lib/types';

/**
 * The app registration funnel's steps, in order, as staff read them — shared
 * by the dashboard card and the weekly email so the two can never word the
 * same number differently.
 */
export const FUNNEL_STEPS: {
  key: keyof FunnelCounts;
  label: string;
  /** How a step's share is phrased against the step before it. */
  ofPrevious?: string;
}[] = [
  { key: 'visitors', label: 'Opened the link' },
  {
    key: 'signups',
    label: 'Created an account',
    ofPrevious: 'of those who opened',
  },
  {
    key: 'started',
    label: 'Started registering',
    ofPrevious: 'of new accounts',
  },
  { key: 'completed', label: 'Finished', ofPrevious: 'of those who started' },
];

/** `null` when the step before is empty — "0 of 0" is not a percentage. */
export function funnelShare(part: number, whole: number): string | null {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : null;
}
