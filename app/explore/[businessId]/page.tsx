import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { MapPin, Star, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { BrandMark } from '@/components/custom/BrandLogo';
import { BusinessMapLazy } from '@/components/customer/BusinessMapLazy';
import { FollowButton } from '@/components/customer/FollowButton';
import { PaginationBar } from '@/components/customer/PaginationBar';
import { ShareButton } from '@/components/customer/ShareButton';
import {
  getPublicBusinessProfile,
  getPublicCoupons,
  isFollowingBusiness,
} from '@/lib/api/customer/customerQuery';
import { getProductsPaginated } from '@/lib/api/products/productQuery';
import { getCurrentUser } from '@/lib/api/getCurrentUser';
import { CouponCard } from './components/coupon-card';
import { ProductCard } from './components/product-card';
import type { ProductResponse } from '@/lib/types';

type Params = Promise<{ businessId: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { businessId } = await params;
  const result = await getPublicBusinessProfile(businessId);
  if ('error' in result) return { title: 'Shop - iLokal' };
  const { business } = result;
  return {
    title: `${business.shop_name} - iLokal`,
    description:
      business.description ??
      `Deals, coupons, and the menu of ${business.shop_name} on iLokal.`,
    openGraph: {
      title: `${business.shop_name} - iLokal`,
      images: business.banner_url ?? business.logo_url ?? undefined,
    },
  };
}

export default async function PublicBusinessPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const [{ businessId }, sp, user] = await Promise.all([
    params,
    searchParams,
    getCurrentUser(),
  ]);

  const menuPage = Math.max(
    1,
    parseInt(typeof sp.menuPage === 'string' ? sp.menuPage : '1', 10) || 1,
  );

  const profileResult = await getPublicBusinessProfile(businessId);
  if ('error' in profileResult) notFound();
  const { business } = profileResult;

  const isCustomer = user ? user.role === 'app_user' : null;

  const [productsResult, couponsResult, following] = await Promise.all([
    getProductsPaginated({
      business_id: business.id,
      status: 'active',
      page: menuPage,
      per_page: 8,
    }),
    getPublicCoupons(business.id),
    user && isCustomer ? isFollowingBusiness(user.id, business.id) : false,
  ]);

  const products =
    'error' in productsResult
      ? {
          products: [] as ProductResponse[],
          total: 0,
          page: 1,
          per_page: 8,
          total_pages: 0,
        }
      : productsResult;
  const coupons = 'error' in couponsResult ? [] : couponsResult.coupons;

  return (
    <div className="flex flex-1 flex-col space-y-6">
      {/* Hero */}
      <div className="bg-primary/10 relative h-40 w-full overflow-hidden rounded-xl sm:h-56">
        {business.banner_url ? (
          <Image
            src={business.banner_url}
            alt=""
            fill
            sizes="(max-width: 1152px) 100vw, 1152px"
            className="object-cover"
            priority
          />
        ) : (
          <div className="flex h-full items-center justify-center opacity-30">
            <BrandMark size={72} />
          </div>
        )}
      </div>

      {/* Identity row */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="bg-muted relative size-16 shrink-0 overflow-hidden rounded-full border">
          {business.logo_url ? (
            <Image
              src={business.logo_url}
              alt={`${business.shop_name} logo`}
              fill
              sizes="64px"
              className="object-cover"
            />
          ) : (
            <div className="text-muted-foreground flex h-full items-center justify-center text-xl font-bold">
              {business.shop_name[0]?.toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {business.shop_name}
            </h1>
            {business.category_name && (
              <Badge variant="secondary">{business.category_name}</Badge>
            )}
          </div>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {business.follower_count} follower
              {business.follower_count === 1 ? '' : 's'}
            </span>
            {business.rating_average !== null && (
              <span className="inline-flex items-center gap-1">
                <Star className="fill-primary text-primary h-3.5 w-3.5" />
                {business.rating_average.toFixed(1)} ({business.rating_count})
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ShareButton businessId={business.id} shopName={business.shop_name} />
          <FollowButton
            businessId={business.id}
            initialFollowing={following}
            isCustomer={isCustomer}
          />
        </div>
      </div>

      {business.description && (
        <p className="text-muted-foreground max-w-3xl text-sm leading-relaxed">
          {business.description}
        </p>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {/* Deals & coupons */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">
              Deals & coupons
            </h2>
            {coupons.length === 0 ? (
              <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
                No live deals right now — follow the shop to catch the next one.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {coupons.map((coupon) => (
                  <CouponCard
                    key={coupon.id}
                    coupon={coupon}
                    branches={business.branches}
                    isCustomer={isCustomer}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Menu / products */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">Menu</h2>
            {products.products.length === 0 ? (
              <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
                This shop hasn&apos;t published its menu yet.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {products.products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
                <PaginationBar
                  metadata={{
                    total: products.total,
                    page: products.page,
                    per_page: products.per_page,
                    total_pages: products.total_pages,
                  }}
                  param="menuPage"
                  noun="item"
                />
              </>
            )}
          </section>
        </div>

        {/* Sidebar: map + branches + interiors */}
        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">Find us</h2>
            <BusinessMapLazy branches={business.branches} />
            <ul className="space-y-2">
              {business.branches.map((branch) => (
                <li
                  key={branch.id}
                  className="flex items-start gap-2 rounded-lg border p-3 text-sm"
                >
                  <MapPin className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium">{branch.name}</p>
                    {branch.address && (
                      <p className="text-muted-foreground text-xs">
                        {branch.address}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {business.interior_images.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold tracking-tight">
                Inside the shop
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {business.interior_images.slice(0, 4).map((src, i) => (
                  <div
                    key={src}
                    className="bg-muted relative aspect-square overflow-hidden rounded-lg"
                  >
                    <Image
                      src={src}
                      alt={`${business.shop_name} interior ${i + 1}`}
                      fill
                      sizes="(max-width: 1024px) 50vw, 200px"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
