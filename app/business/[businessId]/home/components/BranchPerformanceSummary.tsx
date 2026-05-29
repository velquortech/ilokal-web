import Link from 'next/link';
import { Clock, MapPin, MapPinOff, XCircle, BarChart3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { businessPath } from '@/config/routeConfig';
import type { Branch, BranchStatus } from '@/lib/types';

function StatusBadge({ status }: { status: BranchStatus }) {
  if (status === 'pending_review') {
    return (
      <Badge
        variant="secondary"
        className="gap-1 text-xs text-amber-700 dark:text-amber-400"
      >
        <Clock className="size-2.5" />
        Pending
      </Badge>
    );
  }
  if (status === 'rejected') {
    return (
      <Badge variant="destructive" className="gap-1 text-xs">
        <XCircle className="size-2.5" />
        Rejected
      </Badge>
    );
  }
  return (
    <Badge
      variant="secondary"
      className="gap-1 text-xs text-green-700 dark:text-green-400"
    >
      Active
    </Badge>
  );
}

interface BranchPerformanceSummaryProps {
  branches: Branch[];
  businessId: string;
}

export function BranchPerformanceSummary({
  branches,
  businessId,
}: BranchPerformanceSummaryProps) {
  const activeBranches = branches.filter((b) => b.archived_at === null);

  if (activeBranches.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Branch Overview</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href={businessPath(businessId, 'branches')}>
              Manage branches
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {activeBranches.map((branch) => (
            <div
              key={branch.id}
              className="hover:bg-muted/40 flex items-center gap-4 px-6 py-3 transition-colors"
            >
              {/* Name + status */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">
                    {branch.name}
                  </span>
                  <StatusBadge status={branch.status} />
                </div>
                {branch.address && (
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">
                    {branch.address}
                  </p>
                )}
              </div>

              {/* Map status */}
              <div className="hidden sm:block">
                {branch.location ? (
                  <Badge
                    variant="secondary"
                    className="gap-1 text-xs text-green-700 dark:text-green-400"
                  >
                    <MapPin className="size-3" />
                    On map
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <MapPinOff className="text-muted-foreground size-3" />
                    No coordinates
                  </Badge>
                )}
              </div>

              {/* View analytics button */}
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5"
                asChild
              >
                <Link href={`${businessPath(businessId)}?branch=${branch.id}`}>
                  <BarChart3 className="size-3.5" />
                  <span className="hidden sm:inline">View analytics</span>
                  <span className="sm:hidden">View</span>
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
