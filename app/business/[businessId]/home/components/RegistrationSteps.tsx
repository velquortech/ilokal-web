import { cn } from '@/lib/utils';
import { getRegistrationStepMeta } from '@/app/business/registration/data/stepMeta';

/**
 * The steps of the registration wizard, listed for someone who has not started
 * it — so there is no current step to be on.
 *
 * It used to print "Step 1 of N" from a prop that was defaulted and that no
 * caller ever passed, while every row rendered identically: a static list
 * wearing a progress indicator's clothes. The plain count is the honest version
 * of the same information.
 *
 * Reads `stepMeta`, not `getSteps` — it needs the titles, not the wizard's
 * client components.
 */
export function RegistrationSteps({
  requireDocuments = true,
}: {
  requireDocuments?: boolean;
}) {
  const steps = getRegistrationStepMeta(requireDocuments);
  return (
    <div className="flex h-full flex-1">
      <div className="bg-card w-full space-y-6 rounded-xl border p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-foreground text-xl font-semibold tracking-tight">
            What registration asks for
          </p>
          <span className="text-muted-foreground text-xs font-medium">
            {steps.length} steps
          </span>
        </div>

        <div className="relative space-y-4">
          {/* Vertical Line Connector */}
          <div
            className="bg-border absolute top-2 bottom-2 left-3 w-px"
            aria-hidden="true"
          />

          {steps.map((step, index) => {
            const stepNumber = index + 1;
            return (
              <div
                key={step.id}
                className={cn(
                  'relative flex items-center gap-4 opacity-100 transition-opacity duration-300',
                )}
              >
                {/* Icon/Number Circle */}
                <div
                  className={cn(
                    'outline-primary text-primary z-10 flex size-6 items-center justify-center rounded-full border bg-white text-[10px] font-bold outline-2 transition-colors',
                  )}
                >
                  {stepNumber}
                </div>

                <div className="flex flex-col">
                  <span
                    className={cn(
                      'text-foreground text-sm font-medium transition-colors',
                    )}
                  >
                    {step.title}
                  </span>

                  <span
                    className={cn(
                      'text-sm font-normal opacity-60 transition-colors',
                    )}
                  >
                    {step.description}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
