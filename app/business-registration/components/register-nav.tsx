import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, SendHorizonal } from 'lucide-react';
import { ROUTES } from '@/config/routeConfig';
import { useRouter } from 'next/navigation';
import { useMultiStepForm } from '../provider/registration-form-provider';
import { STEPS } from '../data/steps';
import { ApplicationSuccessDialog } from './application-success-dialog';

export function RegistrationNav() {
  const router = useRouter();
  const { step, prevStep, canProceed, nextStep } = useMultiStepForm();
  return (
    <div className="border-border px-auto mt-auto flex justify-between border-t px-10 py-4">
      <div className="inline-flex w-full items-center justify-between">
        {step > 1 ? (
          <Button variant="outline" onClick={prevStep}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => router.replace(ROUTES.BUSINESS.home)}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        )}
        {step < STEPS.length ? (
          <Button onClick={nextStep} disabled={!canProceed}>
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <ApplicationSuccessDialog>
            <Button type="submit">
              Submit for Approval <SendHorizonal />
            </Button>
          </ApplicationSuccessDialog>
        )}
      </div>
    </div>
  );
}
