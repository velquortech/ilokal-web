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
          className="absolute top-0 left-0 h-full w-full object-cover transition-transform duration-700 will-change-transform group-hover:scale-105"
          priority
          sizes="100vw"
        />
      ) : hasBusinessData && business?.banner_url ? (
        <Image
          alt={`${business.shop_name} banner`}
          src={business.banner_url}
          fill
          className="absolute top-0 left-0 h-full w-full object-cover transition-transform duration-700 will-change-transform group-hover:scale-105"
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

      {/* 3. Foreground Content */}
      <div className="relative z-10 flex w-full flex-row items-end justify-between p-8">
        <div className="inline-flex items-end gap-5">
          {/* Logo with clean border */}
          <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl border-2 border-white/20 shadow-2xl">
            <Image
              src={business?.logo_url ?? '/placeholder-logo.png'}
              alt={business?.shop_name ?? 'Shop Logo'}
              width={96}
              height={96}
              className="aspect-square bg-white object-cover"
            />
          </div>

          <div className="flex flex-col pb-1">
            <div className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-white">
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
        <div className="flex flex-col items-end gap-1.5 pb-1">
          {branch ? (
            <div className="flex flex-col items-end gap-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">
                <MapPin className="text-primary size-3" />
                <span>{branch.name}</span>
              </div>
              {branch.address && (
                <span className="text-[11px] font-medium text-white/70">
                  {branch.address}
                </span>
              )}
            </div>
          ) : (
            business?.location && (
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">
                <MapPin className="text-primary size-3" />
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
