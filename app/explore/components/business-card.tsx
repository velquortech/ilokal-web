import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { BrandMark } from '@/components/custom/BrandLogo';
import { explorePath } from '@/config/routeConfig';
import type { DirectoryBusiness } from '@/lib/types';

export function BusinessCard({ business }: { business: DirectoryBusiness }) {
  return (
    <Link
      href={explorePath(business.id)}
      className="group bg-card focus-visible:ring-ring overflow-hidden rounded-xl border transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:outline-none"
    >
      <div className="bg-primary/10 relative h-28 w-full">
        {business.banner_url ? (
          <Image
            src={business.banner_url}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center opacity-40">
            <BrandMark size={40} />
          </div>
        )}
      </div>
      <div className="space-y-2 p-4">
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
                {business.shop_name[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="group-hover:text-primary truncate font-semibold transition-colors">
              {business.shop_name}
            </p>
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1">
                <Users className="h-3 w-3" />
                {business.follower_count} follower
                {business.follower_count === 1 ? '' : 's'}
              </span>
            </div>
          </div>
          {business.category_name && (
            <Badge variant="secondary" className="shrink-0">
              {business.category_name}
            </Badge>
          )}
        </div>
        {business.description && (
          <p className="text-muted-foreground line-clamp-2 text-sm">
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
