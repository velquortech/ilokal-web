'use client';

import { Check, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BRANCH_STEPS } from '../data/steps';
import { useBranchForm } from '../provider/branch-form-provider';

export function BranchStepProgress() {
  const { step } = useBranchForm();

  return (
    <div className="bg-chart-1 border-primary relative hidden h-full shrink-0 flex-col space-y-6 overflow-hidden rounded-lg border p-6 text-white md:flex md:w-52 lg:w-64 lg:space-y-10 lg:p-8 xl:w-80">
      <div className="bg-primary/5 absolute -top-35 -right-20 size-100 rounded-full" />
      <div className="bg-primary/5 absolute -bottom-60 -left-20 size-150 rounded-full" />
      <div className="flex items-center gap-3">
        <div className="shadow-primary/20 flex size-8 shrink-0 items-center justify-center rounded-full bg-white shadow-lg">
          <GitBranch className="text-primary size-4" />
        </div>
        <span className="font-semibold">Add Branch</span>
      </div>
      <div className="hidden lg:block">
        <p className="text-2xl font-semibold">New Branch</p>
        <p className="mt-2 text-sm text-white/70">
          Add a new location for your business so customers can find you nearby.
        </p>
      </div>
      <div className="mt-4 flex flex-col">
        {BRANCH_STEPS.map((data, idx) => (
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
              <div className="bg-primary w-0.5 flex-1 group-last:hidden" />
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
    </div>
  );
}
