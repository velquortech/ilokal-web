import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { resolveStorageUrl } from '@/app/api/helpers/storage';
import { createBearerClient } from '@/supabase/bearer';
import { businessSocialCard } from '@/lib/utils/socialCard';

import { OpenInApp } from './OpenInApp';

// App + store identifiers. Defaults mirror the mobile app's app.json (`scheme`
// `ilokalmobile`, `android.package` `com.ilokal.app`) so the deep link, the
// Android intent and the Play Store fallback all resolve to the real app;
// override via env when the identifiers change:
//   NEXT_PUBLIC_APP_SCHEME        custom URL scheme (app.json `scheme`)
//   NEXT_PUBLIC_ANDROID_PACKAGE   Play Store package / app.json android.package
//   NEXT_PUBLIC_IOS_APP_STORE_ID  numeric App Store id (from App Store Connect)
const APP_SCHEME = process.env.NEXT_PUBLIC_APP_SCHEME || 'ilokalmobile';
const ANDROID_PACKAGE =
  process.env.NEXT_PUBLIC_ANDROID_PACKAGE || 'com.ilokal.app';
const IOS_APP_STORE_ID = process.env.NEXT_PUBLIC_IOS_APP_STORE_ID || '';

// Build the deep link + store URLs for a given business. `business/<id>` maps to
// the app's existing app/business/[id] route via Expo Router's scheme linking.
function buildAppLinks(businessId: string) {
  const path = `business/${businessId}`;
  const androidStoreUrl = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
  const iosStoreUrl = IOS_APP_STORE_ID
    ? `https://apps.apple.com/app/id${IOS_APP_STORE_ID}`
    : 'https://apps.apple.com/search?term=ilokal';
  return {
    appDeepLink: `${APP_SCHEME}://${path}`,
    androidStoreUrl,
    iosStoreUrl,
    // Android Chrome opens the app or, if absent, follows browser_fallback_url.
    androidIntentUrl:
      `intent://${path}#Intent;scheme=${APP_SCHEME};package=${ANDROID_PACKAGE};` +
      `S.browser_fallback_url=${encodeURIComponent(androidStoreUrl)};end`,
  };
}

type Params = { params: Promise<{ businessId: string }> };

type SharedBusiness = {
  id: string;
  name: string;
  description: string;
  logoUrl: string;
};

// Social crawlers (Messenger/Facebook) fetch og:image from their own servers,
// so the URL must be publicly reachable. Dev/seed data hardcodes a local
// Supabase host (127.0.0.1/localhost:54321) that no crawler can reach. When
// NEXT_PUBLIC_PUBLIC_STORAGE_URL is set (a tunnel in dev, unset in prod where
// real images already resolve to the public Supabase host), rewrite only the
// storage host so previews show a thumbnail. Inert in production.
const PUBLIC_STORAGE_URL = process.env.NEXT_PUBLIC_PUBLIC_STORAGE_URL;
function toPublicImageUrl(url: string): string {
  if (!url || !PUBLIC_STORAGE_URL) return url;
  return url.replace(
    /^https?:\/\/(?:127\.0\.0\.1|localhost):54321/,
    PUBLIC_STORAGE_URL,
  );
}

// Anon, public read — only verified, non-archived businesses are shareable.
// `cache` dedupes the call between generateMetadata and the page render.
const getSharedBusiness = cache(
  async (businessId: string): Promise<SharedBusiness | null> => {
    const supabase = createBearerClient();
    const { data, error } = await supabase
      .from('businesses')
      .select('id, shop_name, description, logo_url')
      .eq('id', businessId)
      .eq('status', 'verified')
      .is('archived_at', null)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      name: data.shop_name,
      description: data.description ?? '',
      logoUrl: toPublicImageUrl(
        resolveStorageUrl(supabase, 'shop-logos', data.logo_url) ?? '',
      ),
    };
  },
);

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { businessId } = await params;
  const biz = await getSharedBusiness(businessId);

  if (!biz) return { title: 'Business not found' };

  // `title.template` ('%s · iLokal') from the root layout applies to
  // `metadata.title` and NOT to the OG/Twitter titles, so the brand is spelled
  // out only on those two. Suffixing here as well rendered "Name · iLokal ·
  // iLokal" in the tab.
  const title = biz.name;
  const description = biz.description || `Discover ${biz.name} on iLokal.`;

  return {
    title,
    description,
    // Shares the card builder with /explore/[businessId] so the two public
    // business surfaces cannot drift. This one has no banner to offer, so the
    // image is the generated Brick Ember card (`/api/og/business/:id`), with
    // the square logo kept as the fallback if the generated card is ever
    // dropped. The relative path resolves to an absolute URL via metadataBase.
    ...businessSocialCard({
      name: biz.name,
      description,
      logo: biz.logoUrl,
      cardImage: `/api/og/business/${businessId}`,
      url: `/s/${businessId}`,
    }),
  };
}

export default async function SharedBusinessPage({ params }: Params) {
  const { businessId } = await params;
  const biz = await getSharedBusiness(businessId);

  if (!biz) notFound();

  const links = buildAppLinks(businessId);

  return (
    <main className="bg-background flex min-h-dvh items-center justify-center px-6 py-16">
      <div className="bg-card w-full max-w-md rounded-3xl p-8 text-center shadow-sm">
        {biz.logoUrl ? (
          // Plain <img>: an external OG image host needn't be in next/image's
          // remote-pattern allowlist, and no optimization is needed for a logo.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={biz.logoUrl}
            alt={`${biz.name} logo`}
            className="mx-auto h-24 w-24 rounded-2xl object-cover"
          />
        ) : (
          <div className="bg-primary/10 text-primary mx-auto flex h-24 w-24 items-center justify-center rounded-2xl text-3xl font-semibold">
            {biz.name.charAt(0).toUpperCase()}
          </div>
        )}

        <h1 className="font-display text-foreground mt-6 text-2xl font-bold tracking-tight">
          {biz.name}
        </h1>

        {biz.description ? (
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
            {biz.description}
          </p>
        ) : null}

        <OpenInApp
          appDeepLink={links.appDeepLink}
          androidIntentUrl={links.androidIntentUrl}
          androidStoreUrl={links.androidStoreUrl}
          iosStoreUrl={links.iosStoreUrl}
        />

        <p className="text-muted-foreground mt-4 text-xs">
          Discover local businesses and deals near you.
        </p>
      </div>
    </main>
  );
}
