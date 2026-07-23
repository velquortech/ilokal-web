import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  SendHorizonal,
  Loader2,
} from 'lucide-react';
import { ROUTES } from '@/config/routeConfig';
import { useRouter } from 'next/navigation';
import { useMultiStepForm } from '../provider/registration-form-provider';
import { ApplicationSuccessDialog } from './application-success-dialog';

export function RegistrationNav({
  isSubmitting,
  showSuccessDialog,
  onSuccessDialogChange,
}: {
  isSubmitting: boolean;
  showSuccessDialog: boolean;
  onSuccessDialogChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { step, steps, prevStep, canProceed, nextStep } = useMultiStepForm();

  const handleNext = async () => {
    if (step < steps.length && !isSubmitting) {
      await nextStep();
    }
  };

  return (
    <div className="border-border px-auto mt-auto flex justify-between border-t px-4 py-4 sm:px-10">
      <div className="inline-flex w-full items-center justify-between">
        {step > 1 ? (
          <Button variant="outline" onClick={prevStep} disabled={isSubmitting}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => router.replace(ROUTES.BUSINESS.home)}
            disabled={isSubmitting}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        )}
        {step < steps.length ? (
          <Button onClick={handleNext} disabled={!canProceed || isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        ) : (
          <>
            <Button type="submit" disabled={!canProceed || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit for Approval <SendHorizonal />
                </>
              )}
            </Button>
            <ApplicationSuccessDialog
              open={showSuccessDialog}
              onOpenChange={onSuccessDialogChange}
            />
          </>
        )}
      </div>
    </div>
  );
}
