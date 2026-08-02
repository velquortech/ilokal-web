import { ExploreGridSkeleton } from '@/components/customer/skeletons';

// The events grid is the same shape as the explore grid, so it reuses that
// skeleton rather than adding a near-identical one.
export default function Loading() {
  return <ExploreGridSkeleton />;
}
