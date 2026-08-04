'use client';

import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, Store } from 'lucide-react';
import { ROUTES, businessWelcomePath } from '@/config/routeConfig';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { VisuallyHidden } from 'radix-ui';

/**
 * This dialog used to hardcode "Your shop registration is under review", a
 * 24–48 hour timeline and a three-step "Under Review → Shop Activated"
 * tracker. But `auto_verify_businesses` is seeded TRUE (20260723000000), so on
 * a default install the `set_business_initial_status` trigger has already set
 * the shop `verified` by the time this paints — the owner was told to wait for
 * an approval that had already happened, then landed on a dashboard for a live
 * shop.
 *
 * So it forks on the PERSISTED status returned by the insert:
 *   verified → "Your shop is live"
 *   pending  → the review timeline (unchanged)
 *   unknown  → neutral. Only reachable on a resumed submit, where the row was
 *              not re-created and its status was never read back. Guessing
 *              "under review" there would reproduce the exact lie this fixes.
 */
export function ApplicationSuccessDialog({
  open,
  onOpenChange,
  businessId,
  status,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string | null;
  status: string | null;
}) {
  const router = useRouter();
  const isVerified = status === 'verified';
  const isPending = status === 'pending';

  const handleGoHome = () => {
    // Straight to the dashboard, carrying the one-shot welcome marker. NOT
    // `/business` — that resolver answers with a fresh `redirect()` and drops
    // every search param, so the marker would never arrive. With no id (a
    // resumed submit that lost its marker) fall back to the resolver: the owner
    // still lands on their dashboard, just without the welcome.
    router.push(
      businessId ? businessWelcomePath(businessId) : ROUTES.BUSINESS.home,
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-6 sm:max-w-2xl sm:p-10"
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <VisuallyHidden.Root>
          <DialogTitle>
            {isVerified ? 'Your shop is live' : 'Application submitted'}
          </DialogTitle>
          <DialogDescription>
            {isVerified
              ? 'Your shop is published and visible to shoppers.'
              : 'Your shop registration has been received.'}
          </DialogDescription>
        </VisuallyHidden.Root>

        <div className="font-giest">
          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-green-600/10 p-4">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <h1 className="mb-1 text-xl">
              {isVerified ? 'Your shop is live!' : 'Application Submitted!'}
            </h1>
            <p className="text-muted-foreground text-base">
              {isVerified
                ? 'Shoppers can find you now — a few things left to set up'
                : isPending
                  ? 'Your shop registration is under review'
                  : 'Your shop registration has been received'}
            </p>
          </div>

          {isVerified ? (
            <Card className="mb-6 w-full text-sm">
              <CardHeader>
                <CardTitle>What&rsquo;s next</CardTitle>
                <CardDescription>
                  Your dashboard has a short checklist — each item is one of the
                  things a shopper looks for.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-muted-foreground list-inside list-disc space-y-1">
                  <li>Add opening hours and a contact number</li>
                  <li>Put your first offering on the shop page</li>
                  <li>Publish a deal so you appear in the Deals feed</li>
                </ul>
              </CardContent>
            </Card>
          ) : (
            <Card className="mb-6 w-full text-sm">
              <CardHeader>
                <CardTitle>What happens next?</CardTitle>
                <CardDescription>
                  Our team will review your application within 24-48 hours
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Timeline */}
                <div className="space-y-4">
                  {/* Step 1 - Completed */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="rounded-full bg-green-600 p-2">
                        <CheckCircle className="h-5 w-5 text-white" />
                      </div>
                      <div className="h-full w-0.5 rounded-full bg-green-600"></div>
                    </div>
                    <div className="flex-1 pb-8">
                      <p className="font-medium text-green-600">
                        Application Submitted
                      </p>
                      <p className="text-muted-foreground text-sm">
                        Your shop registration has been received
                      </p>
                      <p className="text-muted-foreground/50 mt-2 text-xs">
                        Completed just now
                      </p>
                    </div>
                  </div>

                  {/* Step 2 - In Progress */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="animate-pulse rounded-full bg-amber-600 p-2">
                        <Clock className="h-5 w-5 text-white" />
                      </div>
                      <div className="h-full w-0.5 rounded-full bg-amber-600"></div>
                    </div>
                    <div className="flex-1 pb-8">
                      <p className="font-medium text-amber-900">Under Review</p>
                      <p className="text-muted-foreground text-sm">
                        Our team is verifying your documents and information
                      </p>
                      <p className="text-muted-foreground/50 mt-2 text-xs">
                        In progress
                      </p>
                    </div>
                  </div>

                  {/* Step 3 - Pending */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="bg-muted rounded-full p-2">
                        <Store className="text-muted-foreground h-5 w-5" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-muted-foreground font-medium">
                        Shop Activated
                      </p>
                      <p className="text-muted-foreground text-sm">
                        Your shop will be activated once approved
                      </p>
                      <p className="text-muted-foreground/50 mt-2 text-xs">
                        Pending
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* The review-process breakdown only makes sense while there is a
              review to wait for. */}
          {!isVerified && (
            <div className="bg-card/50 text-muted-foreground space-y-2 rounded-md p-4">
              <p className="text-sm font-medium">Review Process:</p>
              <ul className="list-inside list-disc space-y-1 text-sm">
                <li>Verification of business documents (12-24 hours)</li>
                <li>
                  Quality check of shop information and images (6-12 hours)
                </li>
                <li>Final approval and activation (2-6 hours)</li>
              </ul>
            </div>
          )}

          <div className="mt-8 flex justify-center">
            <Button onClick={handleGoHome}>
              {isVerified ? 'Go to dashboard' : 'Return to Dashboard'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
