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
import { ROUTES } from '@/config/routeConfig';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { VisuallyHidden } from 'radix-ui';

export function ApplicationSuccessDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();

  const handleGoHome = () => {
    router.push(ROUTES.BUSINESS.home);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="min-w-3xl p-10"
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <VisuallyHidden.Root>
          <DialogTitle>Application Successful</DialogTitle>
          <DialogDescription>Application Successful</DialogDescription>
        </VisuallyHidden.Root>
        {/* Main Content */}
        <div className="font-giest">
          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-green-600/10 p-4">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <h1 className="mb-1 text-xl">Application Submitted!</h1>
            <p className="text-muted-foreground text-base">
              Your shop registration is under review
            </p>
          </div>

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

          <div className="bg-card/50 text-muted-foreground space-y-2 rounded-md p-4">
            <p className="text-sm font-medium">Review Process:</p>
            <ul className="list-inside list-disc space-y-1 text-sm">
              <li>Verification of business documents (12-24 hours)</li>
              <li>Quality check of shop information and images (6-12 hours)</li>
              <li>Final approval and activation (2-6 hours)</li>
            </ul>
          </div>

          <div className="mt-8 flex justify-center">
            <Button onClick={handleGoHome}>Return to Dashboard</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
