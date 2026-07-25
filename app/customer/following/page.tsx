import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BadgePercent, Newspaper, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FollowButton } from '@/components/customer/FollowButton';
import { FeedPager } from '@/components/customer/FeedPager';
import { getCurrentUser } from '@/lib/api/getCurrentUser';
import {
  getFollowedBusinesses,
  getUpdatesFeed,
} from '@/lib/api/customer/customerQuery';
import { ROUTES, explorePath } from '@/config/routeConfig';

export const metadata: Metadata = {
  title: 'Following - iLokal',
  description: 'Shops you follow and their latest updates',
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const TYPE_ICON = {
  post: Newspaper,
  promo: BadgePercent,
  product: Package,
} as const;

const TYPE_LABEL = {
  post: 'Post',
  promo: 'New deal',
  product: 'New product',
} as const;

export default async function FollowingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [user, sp] = await Promise.all([getCurrentUser(), searchParams]);
  if (!user) redirect(ROUTES.AUTH.SIGN_IN);

  const page = Math.max(
    1,
    parseInt(typeof sp.page === 'string' ? sp.page : '1', 10) || 1,
  );

  const [followedResult, feedResult] = await Promise.all([
    getFollowedBusinesses(user.id),
    getUpdatesFeed(user.id, page, 10),
  ]);

  // Outage ≠ empty: a failed shops read must not render "not following
  // anyone" (and must not unmount the updates feed, which loads separately).
  const followedFailed = 'error' in followedResult;
  const followed = followedFailed ? [] : followedResult.followed;
  const followedTotal = followedFailed ? 0 : followedResult.total;
  const feedFailed = 'error' in feedResult;
  const feed = feedFailed
    ? { updates: [], page: 1, per_page: 10, has_more: false }
    : feedResult;

  return (
    <div className="flex flex-1 flex-col space-y-8">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold tracking-tight">Following</h1>
        <p className="text-muted-foreground text-sm">
          Shops you follow, and everything new from them in one feed.
        </p>
      </div>

      {!followedFailed && followed.length === 0 ? (
        <div className="text-muted-foreground space-y-3 rounded-xl border border-dashed p-12 text-center text-sm">
          <p>You aren&apos;t following any shops yet.</p>
          <Button asChild variant="outline" size="sm">
            <Link href={ROUTES.EXPLORE.HOME}>Explore shops</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Updates feed */}
          <section className="space-y-3 lg:col-span-2">
            <h2 className="text-lg font-semibold tracking-tight">Updates</h2>
            {feed.updates.length === 0 ? (
              <p className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
                {feedFailed
                  ? 'Couldn’t load updates right now — please refresh to try again.'
                  : 'Nothing new from your shops yet — check back soon.'}
              </p>
            ) : (
              <>
                <div className="space-y-3">
                  {feed.updates.map((item) => {
                    const Icon = TYPE_ICON[item.type];
                    return (
                      <div
                        key={item.id}
                        className="bg-card flex gap-3 rounded-xl border p-4"
                      >
                        {item.image_url ? (
                          <div className="bg-muted relative size-14 shrink-0 overflow-hidden rounded-lg">
                            <Image
                              src={item.image_url}
                              alt=""
                              fill
                              sizes="56px"
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="bg-primary/10 text-primary flex size-14 shrink-0 items-center justify-center rounded-lg">
                            <Icon className="h-6 w-6" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
                            {item.business && (
                              <Link
                                href={explorePath(item.business.id)}
                                className="hover:text-foreground font-medium"
                              >
                                {item.business.shop_name}
                              </Link>
                            )}
                            <span>· {TYPE_LABEL[item.type]}</span>
                            <span>
                              ·{' '}
                              {new Date(item.published_at).toLocaleDateString(
                                'en-PH',
                                { month: 'short', day: 'numeric' },
                              )}
                            </span>
                          </div>
                          <p className="truncate font-medium">{item.title}</p>
                          {item.body && (
                            <p className="text-muted-foreground line-clamp-2 text-sm">
                              {item.body}
                            </p>
                          )}
                          {item.business && item.type === 'promo' && (
                            <Button
                              asChild
                              variant="link"
                              size="sm"
                              className="h-auto px-0"
                            >
                              <Link href={explorePath(item.business.id)}>
                                View deal →
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <FeedPager page={feed.page} hasMore={feed.has_more} />
              </>
            )}
          </section>

          {/* Followed shops */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">
              Your shops{followedFailed ? '' : ` (${followedTotal})`}
            </h2>
            {followedFailed && (
              <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
                Couldn&apos;t load your shops right now — please refresh to try
                again.
              </p>
            )}
            <div className="space-y-2">
              {followed.map(({ follow_id, business }) => (
                <div
                  key={follow_id}
                  className="bg-card flex items-center gap-3 rounded-xl border p-3"
                >
                  <div className="bg-muted relative size-10 shrink-0 overflow-hidden rounded-full border">
                    {business.logo_url && (
                      <Image
                        src={business.logo_url}
                        alt=""
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <Link
                    href={explorePath(business.id)}
                    className="hover:text-primary min-w-0 flex-1 truncate text-sm font-medium"
                  >
                    {business.shop_name}
                  </Link>
                  <FollowButton
                    businessId={business.id}
                    initialFollowing
                    isCustomer
                  />
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
