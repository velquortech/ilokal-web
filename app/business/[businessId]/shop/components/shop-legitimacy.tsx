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
    /* This band was an unbreakable `inline-flex` row: the two fixed-width
       192px document cards + the text block gave it a ~635px min-content,
       which forced the whole shop page to overflow horizontally on a phone.
       Stack (text, then two cards side by side) until `xl`, where the content
       column is wide enough for the one-line row — at sm/md/lg with the
       sidebar open the row alone needs ~700px. */
    <div className="bg-primary/10 border-primary/30 mt-4 flex flex-col gap-6 rounded-md border px-5 py-6 xl:flex-row xl:items-center xl:px-12 xl:py-8">
      <div className="flex min-w-0 flex-col">
        <span className="text-xl font-semibold">
          {isVerified ? 'Verified Establishment' : 'Business Registration'}
        </span>
        <span className="opacity-60">
          {hasBusinessData
            ? `${business.shop_name} ${isVerified ? 'maintains full compliance with local regulatory standards.' : 'is currently pending verification.'}`
            : 'Ilokal Shop maintains full compliance with local regulatory standards.'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 xl:ml-auto xl:flex">
        <div className="bg-background border-border flex w-full flex-col items-center rounded-md border p-4 text-sm xl:w-48">
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
        <div className="bg-background border-border flex w-full flex-col items-center rounded-md border p-4 text-sm xl:w-48">
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
