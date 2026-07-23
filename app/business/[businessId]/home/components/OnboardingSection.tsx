'use client';

import { Clock, DollarSign, CheckCircle2, ArrowRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getSteps } from '@/app/business/registration/data/steps';
import Image from 'next/image';

interface OnboardingSectionProps {
  onStartTour: () => void;
}

export function OnboardingSection({ onStartTour }: OnboardingSectionProps) {
  return (
    <Card className="bg-card relative flex min-h-100 items-center overflow-hidden border shadow-sm">
      {/* 1. Background Image - Fills whole height and fades in from the right */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-full lg:block lg:w-2/3"
        style={{
          maskImage: 'linear-gradient(to left, black 20%, transparent 80%)',
          WebkitMaskImage:
            'linear-gradient(to left, black 20%, transparent 80%)',
        }}
      >
        <Image
          src="/images/dashboard-sample.png"
          alt="ilokal Dashboard Preview"
          className="h-full w-full object-cover object-left"
          width={'100'}
          height={'100'}
        />
      </div>

      {/* 2. Content Layer */}
      <CardContent className="relative z-10 w-full p-8 lg:p-12">
        <div className="flex max-w-2xl flex-col gap-6">
          <div className="space-y-4">
            <Badge className="bg-primary text-primary-foreground hover:bg-primary/90 flex w-fit gap-1.5 px-3 py-1">
              <Zap className="h-3.5 w-3.5" />
              Quick Start
            </Badge>
            <h2 className="text-foreground text-3xl font-extrabold tracking-tight">
              Complete Your Shop Setup
            </h2>
            <p className="text-muted-foreground max-w-lg text-sm leading-relaxed">
              Register your shop today to unlock full dashboard features, manage
              branches and services, and grow your visibility among local
              customers and tourists.
            </p>
          </div>

          <div className="text-muted-foreground flex flex-wrap gap-x-8 gap-y-3 text-sm font-semibold">
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

          <div className="mt-4 flex flex-col gap-4 sm:flex-row">
            <Button onClick={onStartTour} size="lg" className="shadow-xl">
              Start Registration
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline">
              Learn More
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function OnboardingCard({
  requireDocuments = true,
}: {
  requireDocuments?: boolean;
}) {
  return (
    <div className="hidden w-xs lg:block">
      <div className="bg-card/80 space-y-5 rounded-xl border p-5 shadow-lg">
        <p className="text-foreground text-sm font-medium">
          Registration Progress
        </p>
        <div className="space-y-4">
          {getSteps(requireDocuments).map((step, index) => (
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
