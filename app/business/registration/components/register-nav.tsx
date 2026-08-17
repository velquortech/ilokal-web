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
  createdBusiness,
}: {
  isSubmitting: boolean;
  showSuccessDialog: boolean;
  onSuccessDialogChange: (open: boolean) => void;
  /** The row the submit created — id for the destination, status for the copy. */
  createdBusiness: { id: string; status: string | null } | null;
}) {
  const router = useRouter();
  const { step, steps, prevStep, canProceed, nextStep } = useMultiStepForm();

  const handleNext = async () => {
    if (step < steps.length && !isSubmitting) {
      await nextStep();
    }
  };

  return (
    // `sticky bottom-0` because the shell no longer viewport-locks with an
    // inner scroller — without it the Back/Next/Submit bar scrolls out of view
    // on the tall steps (gallery, documents). `mt-auto` still pins it to the
    // bottom on short steps.
    <div className="border-border bg-background px-auto sticky bottom-0 z-10 mt-auto flex justify-between border-t px-4 py-4 sm:px-10">
      <div className="inline-flex w-full items-center justify-between">
        {/* Explicit `type="button"` on every non-submit button: inside the
            <form>, a bare <Button> defaults to type="submit", so Next/Back
            would ALSO fire the full-form submit handler. Registration is only
            protected from an accidental early submit because its full schema
            requires files + offerings — once the whole form is valid (a fully
            filled application walked back to step 1), clicking Next would
            submit early. The same trap is fixed in the branch wizard. */}
        {step > 1 ? (
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={isSubmitting}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => router.replace(ROUTES.BUSINESS.home)}
            disabled={isSubmitting}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        )}
        {step < steps.length ? (
          <Button
            type="button"
            onClick={handleNext}
            disabled={!canProceed || isSubmitting}
          >
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
              businessId={createdBusiness?.id ?? null}
              status={createdBusiness?.status ?? null}
            />
          </>
        )}
      </div>
    </div>
  );
}
