import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { explorePath } from '@/config/routeConfig';
import { brandToneFor } from '@/lib/utils/brandTone';
import type { DirectoryBusiness } from '@/lib/types';

/**
 * A shop in the directory.
 *
 * Shops without a banner used to get a washed `bg-primary/10` block with a
 * faint mark floating in it, which read as a broken image rather than as an
 * intentional state — and most seeded shops have no banner, so the grid was
 * mostly broken-looking. A bannerless shop now gets a solid brand colour and
 * its own initial at display size: deliberate, and it makes the grid read as a
 * wall of colour the way the landing does.
 *
 * The tone is derived from the shop id (`brandToneFor`), so a shop keeps its
 * colour across renders, pages, pagination — and on its own page.
 */

export function BusinessCard({ business }: { business: DirectoryBusiness }) {
  const initial = business.shop_name[0]?.toUpperCase() ?? '?';

  return (
    <Link
      href={explorePath(business.id)}
      className={cn(
        'group bg-card overflow-hidden rounded-2xl border outline-hidden',
        'shadow-[0_8px_24px_-16px_rgba(60,10,10,.4)]',
        'transition-[transform,box-shadow] duration-300 ease-out',
        'hover:shadow-[0_20px_44px_-20px_rgba(60,10,10,.45)]',
        'focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2',
        'motion-safe:hover:-translate-y-1',
      )}
    >
      <div className="relative h-32 w-full">
        {business.banner_url ? (
          <Image
            src={business.banner_url}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div
            className={cn(
              'flex h-full items-center justify-center',
              brandToneFor(business.id),
            )}
          >
            <span
              aria-hidden
              className="font-display text-5xl leading-none font-bold tracking-tight opacity-90"
            >
              {initial}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-2.5 p-4">
        <div className="flex items-center gap-3">
          <div className="bg-muted relative size-10 shrink-0 overflow-hidden rounded-full border">
            {business.logo_url ? (
              <Image
                src={business.logo_url}
                alt={`${business.shop_name} logo`}
                fill
                sizes="40px"
                className="object-cover"
              />
            ) : (
              <div className="text-muted-foreground flex h-full items-center justify-center text-sm font-semibold">
                {initial}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display group-hover:text-primary truncate text-lg leading-tight font-bold tracking-tight transition-colors">
              {business.shop_name}
            </p>
            <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
              <Users className="h-3 w-3" />
              {business.follower_count} follower
              {business.follower_count === 1 ? '' : 's'}
            </span>
          </div>
          {business.category_name && (
            <span className="bg-secondary text-secondary-foreground shrink-0 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold">
              {business.category_name}
            </span>
          )}
        </div>

        {business.description && (
          <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
            {business.description}
          </p>
        )}
        {business.branch?.address && (
          <p className="text-muted-foreground flex items-center gap-1 truncate text-xs">
            <MapPin className="h-3 w-3 shrink-0" />
            {business.branch.address}
          </p>
        )}
      </div>
    </Link>
  );
}
