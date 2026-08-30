'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Not in `lib/types` because it exists nowhere else and is not part of any
 * domain: `BeforeInstallPromptEvent` is a Chromium-only event that TypeScript's
 * DOM lib does not declare.
 */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISSED_KEY = 'ilokal-install-prompt-dismissed';

/** Storage can throw outright in a private window; never let that break UI. */
function wasDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

function rememberDismissal() {
  try {
    window.localStorage.setItem(DISMISSED_KEY, '1');
  } catch {
    // A viewer who blocks storage is asked again next visit. That is the right
    // failure direction: annoying beats a prompt that cannot be shown at all.
  }
}

/** Already launched from the home screen — there is nothing to install. */
function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    // iOS predates the media query and reports it here instead.
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  // iPadOS 13+ reports as a Mac; the touch-point count is what separates them.
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/**
 * The "add iLokal to your home screen" bar.
 *
 * Two completely different mechanisms behind one component, because the
 * platforms do not agree on whether installing is something a site may ask for:
 *
 *  · **Chromium** fires `beforeinstallprompt`. The event must be captured and
 *    `preventDefault()`ed, then re-fired from a real user gesture — a stashed
 *    event cannot be prompted from an effect, and it is single-use.
 *  · **iOS Safari** fires nothing and exposes no API at all. The only route is
 *    Share → Add to Home Screen, so all this component can do there is say so.
 *
 * Rendered nowhere until one of those two applies, and never once the app is
 * already installed.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    if (isStandalone() || wasDismissed()) return;

    if (isIOS()) {
      setShowIOSHint(true);
      return;
    }

    const onBeforeInstall = (event: Event) => {
      // Without this Chromium shows its own mini-infobar and the event is
      // consumed — there is then nothing left to prompt with later.
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };

    // Installing through the browser's own menu fires this; the bar should go
    // away immediately rather than inviting a second install.
    const onInstalled = () => {
      setDeferred(null);
      setShowIOSHint(false);
      rememberDismissal();
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = useCallback(() => {
    rememberDismissal();
    setDeferred(null);
    setShowIOSHint(false);
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    // Clear first: the event is single-use, so leaving it in state would let a
    // second click call `prompt()` on a spent event, which throws.
    setDeferred(null);
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      // Declining is an answer. Asking again on the next page view is how a
      // prompt becomes something people learn to dismiss without reading.
      if (outcome === 'dismissed') rememberDismissal();
    } catch {
      // A spent or rejected prompt is not worth surfacing — the app is
      // unaffected and the browser menu still offers Install.
    }
  }, [deferred]);

  if (!deferred && !showIOSHint) return null;

  return (
    <div
      // `pb-[env(safe-area-inset-bottom)]` keeps the bar clear of the iPhone
      // home indicator, which otherwise sits over the buttons.
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      role="region"
      aria-label="Install iLokal"
    >
      {/* Centred on a phone, where the bar is nearly full-width and a centred
          card is the only balanced position; pinned to the RIGHT from `md` up,
          where a 28rem card floating in the middle of a wide viewport reads as
          a modal rather than a dismissible bar, and sits over whatever the
          page has in its centre column.

          `mx-auto` then `md:mr-0 md:ml-auto` — the right margin is what
          changes; the left stays `auto` and does the pushing. */}
      <div className="bg-card text-card-foreground mx-auto flex max-w-md flex-wrap items-center gap-3 rounded-xl border p-3 shadow-lg md:mr-0 md:ml-auto">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Add iLokal to your home screen</p>
          <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
            {showIOSHint ? (
              <>
                Tap <Share aria-label="Share" className="inline size-3.5" /> in
                Safari, then <strong>Add to Home Screen</strong>.
              </>
            ) : (
              'Opens full screen, straight from your phone.'
            )}
          </p>
        </div>

        {deferred && (
          <Button size="sm" onClick={install} className="shrink-0">
            <Download className="size-4" />
            Install
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={dismiss}
          // 44px on touch — this is the control someone reaches for first, and
          // a miss re-triggers the thing they are trying to get rid of.
          className="size-11 shrink-0 md:size-9"
        >
          <X className="size-4" />
          <span className="sr-only">Dismiss</span>
        </Button>
      </div>
    </div>
  );
}
