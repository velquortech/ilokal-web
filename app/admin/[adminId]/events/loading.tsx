import { TablePageSkeleton } from '@/components/custom/skeletons';

// Without this the route inherits the DASHBOARD skeleton from the segment
// above, which is the wrong shape for a queue.
export default function Loading() {
  return <TablePageSkeleton />;
}
