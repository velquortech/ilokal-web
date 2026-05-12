import { Clock, ExternalLink } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export function ShopPendingBanner() {
  return (
    <Alert className="rounded-md border-amber-200/50 bg-amber-50/50 px-4 py-2 shadow-none backdrop-blur-sm dark:border-amber-900/30 dark:bg-amber-950/20">
      <div className="flex items-center justify-between gap-4">
        {/* Left Side: Status Info */}
        <div className="flex w-full items-center gap-3">
          <Clock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />

          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-sm font-bold whitespace-nowrap text-amber-900 dark:text-amber-200">
              Awaiting Verification
            </span>
            <span className="hidden truncate text-sm text-amber-800/70 md:inline dark:text-amber-300/60">
              — Your shop is currently invisible to public users while under
              review.
            </span>
          </div>

          <Button
            size="sm"
            className="ml-auto rounded-full border-none bg-amber-200/80 tracking-tight text-amber-900 hover:bg-amber-200"
          >
            Contact Support <ExternalLink />
          </Button>
        </div>
      </div>
    </Alert>
  );
}
