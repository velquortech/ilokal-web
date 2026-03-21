import { BadgeCheck } from 'lucide-react';

export function ShopLegitimacy() {
  return (
    <div className="bg-primary/10 border-primary/30 mt-4 inline-flex items-center rounded-md border px-12 py-8">
      <div className="flex flex-col">
        <span className="text-xl font-semibold">Verified Establishment</span>
        <span className="opacity-60">
          Ilokal Shop maintains full compliance with local regulatory standards.
        </span>
      </div>
      <div className="ml-auto inline-flex gap-4">
        <div className="bg-background border-border flex w-48 flex-col items-center rounded-md border p-4 text-sm">
          <BadgeCheck className="fill-primary text-white" />
          <span className="mt-2 font-medium">Business License</span>
          <span className="text-muted-foreground text-xs">Verified 2026</span>
        </div>
        <div className="bg-background border-border flex w-48 flex-col items-center rounded-md border p-4 text-sm">
          <BadgeCheck className="fill-primary text-white" />
          <span className="mt-2 font-medium">Tax Certificate</span>
          <span className="text-muted-foreground text-xs">Verified 2026</span>
        </div>
      </div>
    </div>
  );
}
