import { Check, CheckCircle2, Clock, DollarSign, Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMultiStepForm } from '../provider/registration-form-provider';

export function StepProgress() {
  const { step, steps } = useMultiStepForm();

  return (
    <div className="bg-chart-1 border-primary relative hidden h-full shrink-0 flex-col space-y-6 overflow-hidden rounded-lg border p-6 text-white md:flex md:w-52 lg:w-64 lg:space-y-10 lg:p-8 xl:w-80 2xl:w-96">
      <div className="bg-primary/5 absolute -top-35 -right-20 size-100 rounded-full"></div>
      <div className="bg-primary/5 absolute -bottom-60 -left-20 size-150 rounded-full"></div>
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
          branches and services, and grow your visibility among local customers
          and tourists.
        </p>
      </div>
    </div>
  );
}
