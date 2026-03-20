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
import { Progress } from '@/components/ui/progress';
import { ONBOARDING_STEPS } from '../lib/data';

interface OnboardingSectionProps {
  onStartTour: () => void;
  onViewRequirements: () => void;
}

export function OnboardingSection({
  onStartTour,
  onViewRequirements,
}: OnboardingSectionProps) {
  return (
    <Card className="border-primary/30 from-primary/10 via-background to-secondary/10 dark:from-primary/20 dark:via-background dark:to-secondary/20 relative overflow-hidden border-2 bg-linear-to-br p-8">
      <div className="from-primary/10 dark:from-primary/20 absolute top-0 right-0 h-full w-1/3 bg-linear-to-l to-transparent" />
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
              <Button variant="outline" size="lg" onClick={onViewRequirements}>
                View Requirements
              </Button>
            </div>
          </div>
          <div className="hidden w-54 lg:block">
            <div className="bg-card/80 space-y-5 rounded-xl border p-5 shadow-lg">
              <p className="text-foreground text-sm font-medium">
                Registration Progress
              </p>
              <div className="space-y-2">
                {ONBOARDING_STEPS.map((step, index) => (
                  <div key={step.label} className="flex items-center gap-3">
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                        step.completed
                          ? 'bg-success text-success-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {step.completed ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span
                      className={`text-sm ${step.completed ? 'text-foreground' : 'text-muted-foreground'}`}
                    >
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
              <Progress value={0} className="h-2" />
              <p className="text-muted-foreground text-xs">0% complete</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
