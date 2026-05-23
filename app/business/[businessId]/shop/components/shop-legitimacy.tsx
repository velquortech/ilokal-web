import { BadgeCheck } from 'lucide-react';
import { BusinessShop } from '@/providers/BusinessProvider';

interface ShopLegitimacyProps {
  business?: BusinessShop | null;
}

export function ShopLegitimacy({ business }: ShopLegitimacyProps) {
  const hasBusinessData = business && business.shop_name;
  const isVerified = business?.status === 'verified';
  const hasVerificationDocs =
    business?.verification_documents?.business_license &&
    business?.verification_documents?.tax_certificate;

  return (
    <div className="bg-primary/10 border-primary/30 mt-4 inline-flex items-center rounded-md border px-12 py-8">
      <div className="flex flex-col">
        <span className="text-xl font-semibold">
          {isVerified ? 'Verified Establishment' : 'Business Registration'}
        </span>
        <span className="opacity-60">
          {hasBusinessData
            ? `${business.shop_name} ${isVerified ? 'maintains full compliance with local regulatory standards.' : 'is currently pending verification.'}`
            : 'Ilokal Shop maintains full compliance with local regulatory standards.'}
        </span>
      </div>
      <div className="ml-auto inline-flex gap-4">
        <div className="bg-background border-border flex w-48 flex-col items-center rounded-md border p-4 text-sm">
          <BadgeCheck
            className={`${
              hasVerificationDocs
                ? 'fill-primary text-white'
                : 'text-muted-foreground'
            }`}
          />
          <span className="mt-2 font-medium">Business License</span>
          <span className="text-muted-foreground text-xs">
            {hasVerificationDocs ? 'Verified' : 'Pending'}
          </span>
        </div>
        <div className="bg-background border-border flex w-48 flex-col items-center rounded-md border p-4 text-sm">
          <BadgeCheck
            className={`${
              hasVerificationDocs
                ? 'fill-primary text-white'
                : 'text-muted-foreground'
            }`}
          />
          <span className="mt-2 font-medium">Tax Certificate</span>
          <span className="text-muted-foreground text-xs">
            {hasVerificationDocs ? 'Verified' : 'Pending'}
          </span>
        </div>
      </div>
    </div>
  );
}
