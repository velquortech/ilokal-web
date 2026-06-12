'use client';

import { useEffect, useState } from 'react';

type Platform = 'ios' | 'android' | 'other';

type Props = {
  /** Custom-scheme deep link, e.g. ilokalmobile://business/<id> (iOS + button). */
  appDeepLink: string;
  /** Android intent:// URL with browser_fallback_url baked in (opens app or store). */
  androidIntentUrl: string;
  androidStoreUrl: string;
  iosStoreUrl: string;
};

function detect(): { platform: Platform; inAppBrowser: boolean } {
  if (typeof navigator === 'undefined') {
    return { platform: 'other', inAppBrowser: false };
  }
  const ua = navigator.userAgent || '';
  const platform: Platform = /iPad|iPhone|iPod/.test(ua)
    ? 'ios'
    : /Android/.test(ua)
      ? 'android'
      : 'other';
  // Messenger / Facebook / Instagram / Line in-app browsers intercept app-link
  // navigations, so auto-redirect is unreliable there — fall back to buttons.
  const inAppBrowser = /FBAN|FBAV|FB_IAB|Instagram|Line\/|Messenger/i.test(ua);
  return { platform, inAppBrowser };
}

const BTN =
  'inline-flex w-full items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90';

export function OpenInApp({
  appDeepLink,
  androidIntentUrl,
  androidStoreUrl,
  iosStoreUrl,
}: Props) {
  const [platform, setPlatform] = useState<Platform>('other');
  const [inAppBrowser, setInAppBrowser] = useState(false);

  useEffect(() => {
    const { platform: p, inAppBrowser: iab } = detect();
    setPlatform(p);
    setInAppBrowser(iab);

    // Desktop, or an in-app webview that would swallow the redirect: don't
    // auto-navigate — let the user tap a button instead.
    if (p === 'other' || iab) return;

    const storeUrl = p === 'ios' ? iosStoreUrl : androidStoreUrl;

    // If the app takes over, the page is hidden/backgrounded — track that so we
    // never bounce an installed-app user to the store.
    let appOpened = false;
    const markOpened = () => {
      if (document.hidden) appOpened = true;
    };
    const onLeave = () => {
      appOpened = true;
    };
    document.addEventListener('visibilitychange', markOpened);
    window.addEventListener('pagehide', onLeave);
    window.addEventListener('blur', onLeave);

    // Android: the intent:// URL opens the app or natively falls back to the
    // store. iOS has no equivalent, so try the scheme then store-fallback below.
    window.location.href = p === 'android' ? androidIntentUrl : appDeepLink;

    const timer = window.setTimeout(() => {
      if (!appOpened && !document.hidden) window.location.href = storeUrl;
    }, 2000);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', markOpened);
      window.removeEventListener('pagehide', onLeave);
      window.removeEventListener('blur', onLeave);
    };
  }, [appDeepLink, androidIntentUrl, androidStoreUrl, iosStoreUrl]);

  const openHref = platform === 'android' ? androidIntentUrl : appDeepLink;

  return (
    <div className="mt-8 flex flex-col gap-3">
      <a href={openHref} className={`${BTN} bg-[#004324] text-white`}>
        Open in the iLokal app
      </a>

      {platform === 'other' ? (
        <div className="flex gap-3">
          <a
            href={androidStoreUrl}
            className={`${BTN} flex-1 border border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-200`}
          >
            Google Play
          </a>
          <a
            href={iosStoreUrl}
            className={`${BTN} flex-1 border border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-200`}
          >
            App Store
          </a>
        </div>
      ) : (
        <a
          href={platform === 'ios' ? iosStoreUrl : androidStoreUrl}
          className={`${BTN} border border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-200`}
        >
          {platform === 'ios'
            ? 'Download on the App Store'
            : 'Get it on Google Play'}
        </a>
      )}

      {inAppBrowser ? (
        <p className="mt-1 text-xs text-gray-400">
          Already have the app? Tap the ··· menu and choose “Open in browser”.
        </p>
      ) : null}
    </div>
  );
}
