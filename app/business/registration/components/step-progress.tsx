import { Check, CheckCircle2, Clock, DollarSign, Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMultiStepForm } from '../provider/registration-form-provider';

export function StepProgress() {
  const { step, steps } = useMultiStepForm();

  return (
    // Shell: exactly one viewport tall (minus the layout's p-3 on both edges)
    // and sticky, so the panel fills the screen and stays put while the page
    // scrolls. Height is fixed rather than `h-full` (which needs a
    // definite-height parent — the chain that broke and left a dead band) or
    // `self-start` (which sizes to content and leaves a gap beneath).
    //
    // `overflow-hidden` stays HERE so the decorative circles are clipped:
    // their negative `-bottom`/`-right` offsets would otherwise create phantom
    // scroll area. Scrolling lives on the inner content layer instead.
    <div className="bg-chart-1 border-primary sticky top-3 hidden h-[calc(100dvh-1.5rem)] shrink-0 flex-col overflow-hidden rounded-lg border text-white md:flex md:w-52 lg:w-64 xl:w-80 2xl:w-96">
      <div className="bg-primary/5 absolute -top-35 -right-20 size-100 rounded-full"></div>
      <div className="bg-primary/5 absolute -bottom-60 -left-20 size-150 rounded-full"></div>
      {/*
        Content layer: carries the padding and the scroll. `min-h-0` lets it
        actually shrink inside the fixed-height flex shell, so on a short
        viewport the steps scroll instead of being clipped.
      */}
      <div className="relative flex min-h-0 flex-1 flex-col space-y-6 overflow-y-auto p-6 lg:space-y-10 lg:p-8">
        <div className="flex items-center gap-3">
          <div className="shadow-primary/20 flex size-8 shrink-0 items-center justify-center rounded-full bg-white shadow-lg group-data-[collapsible=icon]:size-7">
            <Store className="text-primary size-4" />
          </div>
          <span className="font-semibold">iLokal Business</span>
        </div>
        <div className="hidden lg:block">
          <p className="text-4xl font-semibold">Business Registration</p>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/60">
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>Takes only 5 minutes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              <span>Instant approval</span>
            </div>
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-4 w-4" />
              <span>Zero setup fees</span>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-col">
          {steps.map((data, idx) => (
            <div
              key={idx}
              className={cn(
                'group flex flex-row items-start gap-x-4 text-sm lg:gap-x-7',
                idx + 1 > step && 'opacity-50',
              )}
            >
              <div className="flex h-16 w-max flex-col items-center lg:h-20">
                <div className="ring-primary text-chart-2 flex size-5 items-center justify-center rounded-full bg-white text-xs ring-3">
                  {idx + 1 < step && <Check className="size-3.5" />}
                  {idx + 1 >= step && (
                    <span className="font-semibold text-black">{idx + 1}</span>
                  )}
                </div>
                <div className="bg-primary w-0.5 flex-1 group-last:hidden"></div>
              </div>
              <div className="flex -translate-y-1 flex-col">
                <span className="font-semibold">{data.title}</span>
                <span className="hidden text-white/60 lg:block">
                  {data.description}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-auto hidden border-t border-white/30 pt-8 text-sm lg:block">
          <p className="text-white/80">
            <span className="font-semibold text-white">Free to list.</span>{' '}
            Register your shop today to unlock full dashboard features, manage
            branches and services, and grow your visibility among local
            customers and tourists.
          </p>
        </div>
      </div>
    </div>
  );
}
