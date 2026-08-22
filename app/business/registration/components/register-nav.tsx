import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  AlertCircle,
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
  const {
    step,
    steps,
    prevStep,
    canProceed,
    nextStep,
    stepIssues,
    showStepIssues,
  } = useMultiStepForm();

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
    <div className="border-border bg-background px-auto sticky bottom-0 z-10 mt-auto flex flex-col gap-3 border-t px-4 py-4 sm:px-10">
      {/*
        Sits directly above the button the owner just pressed, because that is
        where they are looking. `role="alert"` so it is announced rather than
        silently painted; the list is what replaces the old dead grey Next.
      */}
      {showStepIssues && stepIssues.length > 0 && (
        <Alert variant="destructive" id="registration-step-issues" role="alert">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {stepIssues.length === 1
              ? 'One thing still needs your attention'
              : `${stepIssues.length} things still need your attention`}
          </AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-4">
              {stepIssues.map((issue) => (
                <li key={`${issue.path}::${issue.message}`}>{issue.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
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
            // Deliberately NOT gated on `canProceed`. A disabled Next is how an
            // owner ends up staring at a grey button with no idea which field is
            // missing — RHF only surfaces an error once its field is touched, so
            // an untouched required field showed nothing at all. It also made
            // `reg_step_error` unreachable, leaving the funnel blind to exactly
            // the step people abandon. `.claude/REGISTRATION_FUNNEL.md` (P4).
            disabled={isSubmitting}
            // The affordance is kept as a hint, not a block: pressing it on an
            // invalid step is a legitimate action that produces an explanation.
            variant={canProceed ? 'default' : 'secondary'}
            aria-describedby={
              showStepIssues && stepIssues.length > 0
                ? 'registration-step-issues'
                : undefined
            }
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
            <Button
              type="submit"
              disabled={isSubmitting}
              variant={canProceed ? 'default' : 'secondary'}
            >
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
