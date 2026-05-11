'use client';

import {
  Clock,
  DollarSign,
  CheckCircle2,
  ArrowRight,
  Store,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { STEPS } from '@/app/business-registration/data/steps';

interface OnboardingSectionProps {
  onStartTour: () => void;
}

export function OnboardingSection({ onStartTour }: OnboardingSectionProps) {
  return (
    <Card className="bg-primary/10 border-primary/30 relative overflow-hidden border p-8">
      <CardContent className="relative p-2">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="from-primary/60 to-primary shadow-primary/20 flex size-16 items-center justify-center rounded-xl bg-linear-to-r shadow-lg">
                <Store className="text-primary-foreground size-8" />
              </div>
              <div>
                <Badge
                  variant="secondary"
                  className="mb-1 bg-amber-600/20 text-xs text-amber-600 dark:text-amber-300"
                >
                  Action Required
                </Badge>
                <h2 className="text-foreground text-2xl font-bold">
                  Complete Your Shop Setup
                </h2>
              </div>
            </div>
            <p className="text-muted-foreground mt-6 max-w-lg">
              Register your shop today to unlock full dashboard features, manage
              branches and services, and grow your visibility among local
              customers and tourists.
            </p>
            <div className="text-muted-foreground mt-6 flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="text-primary h-4 w-4" />
                <span>Takes only 5 minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-primary h-4 w-4" />
                <span>Instant approval</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="text-primary h-4 w-4" />
                <span>Zero setup fees</span>
              </div>
            </div>
            <div className="mt-7 flex gap-3">
              <Button
                onClick={onStartTour}
                size="lg"
                className="shadow-primary/20 shadow-lg"
              >
                Start Registration
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
          <OnboardingCard />
        </div>
      </CardContent>
    </Card>
  );
}

export function OnboardingCard() {
  return (
    <div className="hidden w-xs lg:block">
      <div className="bg-card/80 space-y-5 rounded-xl border p-5 shadow-lg">
        <p className="text-foreground text-sm font-medium">
          Registration Progress
        </p>
        <div className="space-y-4">
          {STEPS.map((step, index) => (
            <div key={step.title} className="flex items-center gap-5">
              <div className="bg-primary/20 flex size-6 items-center justify-center rounded-full text-xs font-medium">
                {index + 1}
              </div>
              <span className="text-sm">{step.title}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
