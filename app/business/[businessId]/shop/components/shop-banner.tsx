import { Check, MapPin } from 'lucide-react';
import Image from 'next/image';
import { BusinessShop } from '@/providers/BusinessProvider';
import type { Branch } from '@/lib/types';

interface ShopBannerProps {
  business?: BusinessShop | null;
  branch?: Branch | null;
}

export function ShopBanner({ business, branch }: ShopBannerProps) {
  const hasBusinessData = business && business.shop_name;

  return (
    <div className="bg-muted border-border group relative flex h-80 w-full flex-row items-end justify-between overflow-hidden rounded-2xl border shadow-sm">
      {/* 1. Main Banner Image — prefer branch cover, fall back to business banner */}
      {branch?.cover_image_url ? (
        <Image
          alt={`${branch.name} cover`}
          src={branch.cover_image_url}
          fill
          className="absolute top-0 left-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          priority
          sizes="100vw"
        />
      ) : hasBusinessData && business?.banner_url ? (
        <Image
          alt={`${business.shop_name} banner`}
          src={business.banner_url}
          fill
          className="absolute top-0 left-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          priority
          sizes="100vw"
        />
      ) : (
        <div className="from-primary/20 via-primary/10 to-background absolute inset-0 bg-linear-to-br" />
      )}

      {/* 2. Glossy Gradient Overlay (The Blur Effect) */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/80 via-black/40 to-transparent backdrop-blur-[2px]"
        aria-hidden="true"
      />

      {/* 3. Foreground Content

          `flex-wrap` matters: this row used to be an unbreakable
          `justify-between` — logo + name + the full address chip on one line
          gave it a ~480px min-content, which forced the whole shop page to
          overflow sideways on a phone. On narrow screens the address block
          wraps below the name instead. */}
      <div className="relative z-10 flex w-full flex-wrap items-end justify-between gap-4 p-6 sm:p-8">
        <div className="inline-flex min-w-0 items-end gap-4 sm:gap-5">
          {/* Logo with clean border — a shop without a logo gets its initial on
              white (same pattern as the explore grid + public page) instead of
              a 404 placeholder file. */}
          <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl border-2 border-white/20 shadow-2xl sm:size-24">
            {business?.logo_url ? (
              <Image
                src={business.logo_url}
                alt={business.shop_name ?? 'Shop Logo'}
                width={96}
                height={96}
                className="aspect-square bg-white object-cover"
              />
            ) : (
              <div className="text-foreground flex size-full items-center justify-center bg-white text-3xl font-extrabold">
                {business?.shop_name?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-col pb-1">
            <div className="flex items-center gap-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              {hasBusinessData ? business.shop_name : 'Ilokal Shop'}
              {business?.status === 'verified' && (
                <div className="bg-primary flex h-6 w-6 items-center justify-center rounded-full shadow-lg ring-2 ring-white/20">
                  <Check className="text-primary-foreground size-3.5 stroke-4" />
                </div>
              )}
            </div>
            <p className="mt-2 line-clamp-2 max-w-xl text-sm leading-relaxed font-medium text-white/90">
              {hasBusinessData && business.description
                ? business.description
                : 'Experience the local flavors and craftsmanship of our curated shop collections.'}
            </p>
          </div>
        </div>

        {/* Location & Category Details */}
        <div className="flex min-w-0 flex-col items-start gap-1.5 pb-1 sm:items-end">
          {branch ? (
            <div className="flex flex-col items-start gap-1 sm:items-end">
              <div className="inline-flex max-w-full min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs leading-tight font-bold text-white backdrop-blur-md">
                <MapPin className="text-primary size-3 shrink-0" />
                <span>{branch.name}</span>
              </div>
              {branch.address && (
                <span className="max-w-full text-[11px] font-medium text-white/70">
                  {branch.address}
                </span>
              )}
            </div>
          ) : (
            business?.location && (
              // `truncate` was tempting here but it sets `white-space: nowrap`,
              // which raises the chip's min-content to the FULL address line
              // and re-blows the banner out sideways — let the address wrap
              // inside the pill instead.
              <div className="inline-flex max-w-full min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs leading-tight font-bold text-white backdrop-blur-md">
                <MapPin className="text-primary size-3 shrink-0" />
                <span className="capitalize">
                  {business.location.street_address}{' '}
                  {business.location.barangay}, {business.location.city},{' '}
                  {business.location.province} {business.location.zip_code}
                </span>
              </div>
            )
          )}
          {business?.business_category && (
            <span className="text-[11px] font-black tracking-widest text-white/60 uppercase">
              {business.business_category.name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
