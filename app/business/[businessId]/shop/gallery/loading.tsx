import {
  PageHeaderSkeleton,
  StatusRegion,
} from '@/components/custom/skeletons';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <StatusRegion>
      <PageHeaderSkeleton action={false} />
      <div className="rounded-xl border p-6">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    </StatusRegion>
  );
}
