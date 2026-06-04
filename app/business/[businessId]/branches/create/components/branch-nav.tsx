'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2, Send } from 'lucide-react';
import { useBranchForm } from '../provider/branch-form-provider';
import { BRANCH_STEPS } from '../data/steps';

interface BranchNavProps {
  isSubmitting: boolean;
  onBack: () => void;
}

export function BranchNav({ isSubmitting, onBack }: BranchNavProps) {
  const { step, prevStep, canProceed, nextStep } = useBranchForm();

  const handleNext = async () => {
    if (step < BRANCH_STEPS.length && !isSubmitting) {
      await nextStep();
    }
  };

  return (
    <div className="border-border mt-auto flex justify-between border-t px-4 py-4 sm:px-10">
      <div className="inline-flex w-full items-center justify-between">
        {step > 1 ? (
          <Button variant="outline" onClick={prevStep} disabled={isSubmitting}>
            <ChevronLeft className="mr-2 size-4" />
            Back
          </Button>
        ) : (
          <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
            <ChevronLeft className="mr-2 size-4" />
            Back to Branches
          </Button>
        )}

        {step < BRANCH_STEPS.length ? (
          <Button onClick={handleNext} disabled={!canProceed || isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <>
                Next
                <ChevronRight className="ml-2 size-4" />
              </>
            )}
          </Button>
        ) : (
          <Button type="submit" disabled={!canProceed || isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Send className="mr-2 size-4" />
                Submit Application
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
