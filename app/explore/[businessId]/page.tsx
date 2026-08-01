import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { MapPin, Star, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { BusinessMapLazy } from '@/components/customer/BusinessMapLazy';
import { FollowButton } from '@/components/customer/FollowButton';
import { PaginationBar } from '@/components/customer/PaginationBar';
import { ShareButton } from '@/components/customer/ShareButton';
import {
  getPublicBusinessProfile,
  getPublicCoupons,
  getPublicMenu,
  isFollowingBusiness,
} from '@/lib/api/customer/customerQuery';
import { getCurrentUser } from '@/lib/api/getCurrentUser';
import { businessSocialCard } from '@/lib/utils/socialCard';
import { brandToneFor } from '@/lib/utils/brandTone';
import { cn } from '@/lib/utils';
import { getOfferingVocabulary } from '@/lib/api/offerings/offeringQuery';
import { getBookingsEnabled } from '@/lib/api/appSettings';
import { getSectionsForDisplay } from '@/lib/api/sections/sectionQuery';
import { groupOfferingsBySection } from '@/lib/utils/groupOfferings';
import { BusinessInfoPanel } from './components/business-info-panel';
import { CouponCard } from './components/coupon-card';
import { InteriorGallery } from './components/interior-gallery';
import { ProductCard } from './components/product-card';
import type { PublicProduct } from '@/lib/types';

type Params = Promise<{ businessId: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { businessId } = await params;
  const result = await getPublicBusinessProfile(businessId);
  if ('error' in result) return { title: 'Shop' };
  const { business } = result;
  const description =
    business.description ??
    `Deals, coupons, and the menu of ${business.shop_name} on iLokal.`;

  return {
    title: business.shop_name,
    description,
    // Declaring `openGraph` here REPLACES the root layout's, so site name,
    // type, locale and url have to be restated — the helper owns that, and
    // keeps twitter:image on the same picture as og:image.
    ...businessSocialCard({
      name: business.shop_name,
      description,
      banner: business.banner_url,
      logo: business.logo_url,
      url: `/explore/${businessId}`,
    }),
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
  // Only a genuine miss 404s — a transient read failure must not deindex a
  // healthy shop, so it surfaces to the error boundary instead.
  if ('error' in profileResult) {
    if (profileResult.error === 'NOT_FOUND') notFound();
    throw new Error('Failed to load this shop — please try again.');
  }
  const { business } = profileResult;

  const isCustomer = user ? user.role === 'app_user' : null;

  const [
    productsResult,
    couponsResult,
    following,
    vocabulary,
    bookingsEnabled,
    sections,
  ] = await Promise.all([
    getPublicMenu(business.id, menuPage, 8),
    getPublicCoupons(business.id),
    user && isCustomer ? isFollowingBusiness(user.id, business.id) : false,
    // A salon's public page should read "Service Menu", not "Menu".
    getOfferingVocabulary(business.id),
    getBookingsEnabled(),
    // Names and order only — this page renders no counts, and the aggregate
    // RPC is not worth a per-request cost on the busiest anonymous route.
    // Public read: RLS exposes sections of verified, non-archived shops only.
    getSectionsForDisplay(business.id),
  ]);

  const products =
    'error' in productsResult
      ? {
          products: [] as PublicProduct[],
          metadata: { total: 0, page: 1, per_page: 8, total_pages: 0 },
        }
      : productsResult;
  const coupons = 'error' in couponsResult ? [] : couponsResult.coupons;
  const couponsFailed = 'error' in couponsResult;
  const menuFailed = 'error' in productsResult;
  const initial = business.shop_name[0]?.toUpperCase() ?? '?';
  // Grouping is per PAGE of the menu, not per shop: the menu is paginated, so a
  // section spanning a boundary is headed again on the next page — the way a
  // printed menu reads. Fetching every offering to group globally is the
  // unbounded read the perf standard forbids.
  const menuGroups = groupOfferingsBySection(products.products, sections);

  return (
    <div className="flex flex-1 flex-col space-y-6">
      {/* Hero. A shop with no banner gets the SAME id-derived brand tone it had
          in the directory grid — colour is this shop's identity, so it has to
          survive the click. The washed `bg-primary/10` block with a faint mark
          floating in it that used to live here read as a broken image. */}
      <div className="relative h-40 w-full overflow-hidden rounded-2xl sm:h-56">
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
          <div
            className={cn(
              'flex h-full items-center justify-center',
              brandToneFor(business.id),
            )}
          >
            <span
              aria-hidden
              className="font-display text-7xl leading-none font-bold tracking-tight opacity-90 sm:text-8xl"
            >
              {initial}
            </span>
          </div>
        )}
      </div>

      {/* Identity row */}
      <div className="flex flex-wrap items-center gap-4">
        <div
          className={cn(
            'relative size-16 shrink-0 overflow-hidden rounded-full border',
            business.logo_url ? 'bg-muted' : brandToneFor(business.id),
          )}
        >
          {business.logo_url ? (
            <Image
              src={business.logo_url}
              alt={`${business.shop_name} logo`}
              fill
              sizes="64px"
              className="object-cover"
            />
          ) : (
            <div className="font-display flex h-full items-center justify-center text-2xl font-bold">
              {initial}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-[clamp(1.875rem,3vw,2.75rem)] leading-tight font-bold tracking-tight">
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
            <h2 className="font-display text-xl font-bold tracking-tight">
              Deals & coupons
            </h2>
            {coupons.length === 0 ? (
              <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
                {couponsFailed
                  ? 'Couldn’t load deals right now — please refresh to try again.'
                  : 'No live deals right now — follow the shop to catch the next one.'}
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

          {/* Menu / products / services — heading follows the vertical */}
          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold tracking-tight">
              {vocabulary.catalogue}
            </h2>
            {products.products.length === 0 ? (
              <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
                {menuFailed
                  ? `Couldn’t load the ${vocabulary.plural.toLowerCase()} right now — please refresh to try again.`
                  : `This shop hasn't published its ${vocabulary.plural.toLowerCase()} yet.`}
              </p>
            ) : (
              <>
                {/* Grouped under the shop's own headings, in the shop's own
                    order. A shop that has never made a section gets ONE
                    unnamed group, which renders as the plain grid it has
                    always been. */}
                {menuGroups.map((group) => (
                  <div key={group.id ?? 'more'} className="space-y-3">
                    {group.name && (
                      <h3 className="font-display text-muted-foreground text-sm font-bold tracking-[0.14em] uppercase">
                        {group.name}
                      </h3>
                    )}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {group.products.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          bookingsEnabled={bookingsEnabled}
                          // Owners/admins/anon don't get a booking CTA,
                          // matching how FollowButton and Redeem are gated.
                          canBook={isCustomer === true}
                          branches={business.branches}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                <PaginationBar
                  metadata={products.metadata}
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
            <h2 className="font-display text-xl font-bold tracking-tight">
              Find us
            </h2>
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

          <InteriorGallery
            images={business.interior_images}
            shopName={business.shop_name}
          />

          {/* Hours / contact / socials. Renders nothing when the shop has
              published none of them — a settings row only exists once the
              owner saves. */}
          <BusinessInfoPanel info={business.info} />
        </div>
      </div>
    </div>
  );
}
