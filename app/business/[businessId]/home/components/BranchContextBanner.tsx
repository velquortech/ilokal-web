import Link from 'next/link';
import { ArrowLeft, GitBranch } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface BranchContextBannerProps {
  branchName: string;
  clearHref: string;
}

export function BranchContextBanner({
  branchName,
  clearHref,
}: BranchContextBannerProps) {
  return (
    <div className="bg-primary/5 border-primary/20 flex items-center justify-between rounded-lg border px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 rounded-md p-1.5">
          <GitBranch className="text-primary size-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Branch analytics</span>
            <Badge
              variant="secondary"
              className="text-primary bg-primary/10 text-xs"
            >
              {branchName}
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs">
            All metrics below are filtered to this branch only
          </p>
        </div>
      </div>
      <Button variant="ghost" size="sm" asChild className="gap-1.5">
        <Link href={clearHref}>
          <ArrowLeft className="size-3.5" />
          All branches
        </Link>
      </Button>
    </div>
  );
}
