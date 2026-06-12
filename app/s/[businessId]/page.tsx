import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { resolveStorageUrl } from '@/app/api/helpers/storage';
import { createBearerClient } from '@/supabase/bearer';

import { OpenInApp } from './OpenInApp';

// App + store identifiers. Defaults are the current (placeholder) values; set
// the real ones via env before publishing:
//   NEXT_PUBLIC_APP_SCHEME        custom URL scheme (app.json `scheme`)
//   NEXT_PUBLIC_ANDROID_PACKAGE   Play Store package / app.json android.package
//   NEXT_PUBLIC_IOS_APP_STORE_ID  numeric App Store id (from App Store Connect)
const APP_SCHEME = process.env.NEXT_PUBLIC_APP_SCHEME || 'ilokalmobile';
const ANDROID_PACKAGE =
  process.env.NEXT_PUBLIC_ANDROID_PACKAGE || 'com.anonymous.ilokalmobile';
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

  if (!biz) return { title: 'Business not found · iLokal' };

  const title = `${biz.name} · iLokal`;
  const description = biz.description || `Discover ${biz.name} on iLokal.`;
  const images = biz.logoUrl ? [biz.logoUrl] : [];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'iLokal',
      images,
    },
    twitter: {
      // `summary` (square thumbnail) suits the logo; large-image would crop it.
      card: 'summary',
      title,
      description,
      images,
    },
  };
}

export default async function SharedBusinessPage({ params }: Params) {
  const { businessId } = await params;
  const biz = await getSharedBusiness(businessId);

  if (!biz) notFound();

  const links = buildAppLinks(businessId);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#fbf9f8] px-6 py-16 dark:bg-gray-950">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-sm dark:bg-gray-900">
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
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-[#004324]/10 text-3xl font-semibold text-[#004324]">
            {biz.name.charAt(0).toUpperCase()}
          </div>
        )}

        <h1 className="mt-6 text-2xl font-semibold text-gray-900 dark:text-gray-50">
          {biz.name}
        </h1>

        {biz.description ? (
          <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            {biz.description}
          </p>
        ) : null}

        <OpenInApp
          appDeepLink={links.appDeepLink}
          androidIntentUrl={links.androidIntentUrl}
          androidStoreUrl={links.androidStoreUrl}
          iosStoreUrl={links.iosStoreUrl}
        />

        <p className="mt-4 text-xs text-gray-400">
          Discover local businesses and deals near you.
        </p>
      </div>
    </main>
  );
}
