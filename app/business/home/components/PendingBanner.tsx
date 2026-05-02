import { Clock, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export function ShopPendingBanner() {
  return (
    <Alert className="border-amber-200/60 bg-amber-50/40 py-4 shadow-sm backdrop-blur-sm dark:border-amber-900/40 dark:bg-amber-950/20">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex gap-4">
          <div className="h-fit rounded-xl bg-amber-100 p-2.5 dark:bg-amber-900/50">
            <Clock className="h-5 w-5 text-amber-700 dark:text-amber-400" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <AlertTitle className="mb-0 font-bold text-amber-900 dark:text-amber-200">
                Awaiting Verification
              </AlertTitle>
              <Badge className="h-5 border-none bg-amber-200 text-[10px] font-bold tracking-wider text-amber-900 uppercase hover:bg-amber-200">
                Reviewing
              </Badge>
            </div>
            <AlertDescription className="text-sm text-amber-800/80 dark:text-amber-300/80">
              Our admins are verifying your shop details. You can continue
              setting up your catalog, but your shop won't be visible to
              tourists just yet.
            </AlertDescription>
          </div>
        </div>
        <button className="flex shrink-0 items-center text-sm font-bold text-amber-700 hover:underline dark:text-amber-400">
          Contact Support <ExternalLink className="ml-1.5 h-3 w-3" />
        </button>
      </div>
    </Alert>
  );
}
