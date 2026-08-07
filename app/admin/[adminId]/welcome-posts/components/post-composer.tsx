'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeftRight,
  Download,
  ImageIcon,
  Loader2,
  RotateCcw,
  TriangleAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WelcomePostCandidate } from '@/lib/types';
import {
  DEFAULT_TEXT_SCALES,
  POST_RATIOS,
  SCALE_DEFAULT,
  SCALE_MAX,
  SCALE_MIN,
  TEXT_SCALES,
  type PostRatio,
  type TextScaleKey,
  type TextScales,
} from '@/lib/og/welcomePost';

/**
 * The composer.
 *
 * The post is the hero and the controls are a rail beside it. That is the one
 * deliberate move: the rendered image is what this page exists to make, judge
 * and download, and it previously sat in the SMALLER of two equal cards while
 * a checkbox list took the larger one.
 *
 * The palette and type are the admin shell's throughout. Inventing a look for
 * a single internal tool would be the wrong kind of distinctive.
 */

/** Two cards is what the template holds; a third would have nowhere to go. */
const MAX_SELECTED = 2;

/** Without this a slider drag is one full server render per pixel. */
const PREVIEW_DEBOUNCE_MS = 300;

const RATIO_HINTS: Record<PostRatio, string> = {
  '1x1': 'Facebook · Instagram · Threads · LinkedIn',
  '4x5': 'More feed height on Instagram & Threads',
};

/** Which card a selected shop becomes — the route renders `ids` in order. */
const SLOT_LABELS = ['Left card', 'Right card'] as const;

interface PostComposerProps {
  candidates: WelcomePostCandidate[];
  initialIds: string[];
  brandFontAvailable: boolean;
}

function useDebounced<T>(value: T, delay: number): T {
  const [settled, setSettled] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return settled;
}

export function PostComposer({
  candidates,
  initialIds,
  brandFontAvailable,
}: PostComposerProps) {
  const [selected, setSelected] = React.useState<string[]>(() =>
    initialIds
      .filter((id) => candidates.some((c) => c.id === id))
      .slice(0, MAX_SELECTED),
  );
  const [hidden, setHidden] = React.useState<string[]>([]);
  const [ratio, setRatio] = React.useState<PostRatio>('1x1');
  const [scales, setScales] = React.useState<TextScales>(DEFAULT_TEXT_SCALES);

  /**
   * Which URL has finished, rather than a status flag set by an effect.
   *
   * The effect version (`useEffect(() => setStatus('loading'), [previewSrc])`)
   * ran AFTER the `<img>` had committed, so a cached response — and the
   * previous version of the route advertised itself as immutable for a year —
   * could fire `load` before the flag was set, leaving a spinner over a fully
   * rendered post with nothing to clear it. Most likely on exactly the `?ids=`
   * entry the dashboard prompt creates.
   *
   * Deriving it during render makes that unrepresentable: a `src` is loading
   * until it is the one that loaded.
   */
  const [loadedSrc, setLoadedSrc] = React.useState<string | null>(null);
  const [failedSrc, setFailedSrc] = React.useState<string | null>(null);
  const [downloading, setDownloading] = React.useState(false);
  const [downloadError, setDownloadError] = React.useState(false);

  // The sliders stay live while the request behind them does not.
  const appliedScales = useDebounced(scales, PREVIEW_DEBOUNCE_MS);

  const byId = React.useMemo(
    () => new Map(candidates.map((shop) => [shop.id, shop])),
    [candidates],
  );

  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : // Oldest drops out rather than the click doing nothing — a checkbox
          // that ignores a click reads as broken.
          [...current, id].slice(-MAX_SELECTED),
    );

  const toggleName = (id: string) =>
    setHidden((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );

  const query = React.useMemo(() => {
    const params = new URLSearchParams({ ids: selected.join(','), ratio });
    const hide = hidden.filter((id) => selected.includes(id));
    if (hide.length) params.set('hideName', hide.join(','));
    for (const key of Object.keys(TEXT_SCALES) as TextScaleKey[]) {
      const value = appliedScales[key];
      if (value !== SCALE_DEFAULT) {
        params.set(TEXT_SCALES[key].param, value.toFixed(2));
      }
    }
    return params.toString();
  }, [selected, ratio, hidden, appliedScales]);

  const previewSrc = selected.length
    ? `/api/admin/welcome-post?${query}`
    : null;

  const status: 'idle' | 'loading' | 'error' = !previewSrc
    ? 'idle'
    : failedSrc === previewSrc
      ? 'error'
      : loadedSrc === previewSrc
        ? 'idle'
        : 'loading';

  /**
   * A cached image can be `complete` before React attaches `onLoad`.
   *
   * The ref callback runs on commit, which is early enough to catch it — and
   * it is the same code path as the event, so there is no second way for the
   * state to be set.
   */
  const captureIfAlreadyLoaded = React.useCallback(
    (img: HTMLImageElement | null) => {
      // `previewSrc`, NOT `img.src`: the DOM resolves the latter to an
      // absolute URL, which never equals the relative string the status
      // compares against — so recording it would leave the spinner up
      // permanently, which is the bug this whole mechanism replaced. The
      // `<img>` is keyed on `previewSrc`, so the element and this closure
      // always describe the same request.
      if (img?.complete && img.naturalWidth > 0) setLoadedSrc(previewSrc);
    },
    [previewSrc],
  );

  /**
   * Downloads the image already in the browser cache rather than asking the
   * server to render it a second time.
   *
   * The plain `<a download>` re-rendered the whole post — and if that second
   * render failed, `download` cheerfully saved the JSON error body to disk as
   * a `.png`. Fetching the blob means one render, a real pending state, and a
   * failure that can be reported.
   */
  const download = React.useCallback(async () => {
    if (!previewSrc || downloading) return;
    setDownloading(true);
    setDownloadError(false);
    try {
      const response = await fetch(`${previewSrc}&download=1`);
      if (!response.ok) throw new Error(String(response.status));
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download =
        response.headers
          .get('content-disposition')
          ?.match(/filename="([^"]+)"/)?.[1] ?? 'ilokal-welcome-post.png';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError(true);
    } finally {
      setDownloading(false);
    }
  }, [previewSrc, downloading]);

  const scalesAreDefault = (Object.keys(TEXT_SCALES) as TextScaleKey[]).every(
    (key) => scales[key] === SCALE_DEFAULT,
  );

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_1fr]">
      {/* ── Controls. Deliberately quiet: no card chrome, small type, so the
             artefact beside them is not competing for attention. ── */}
      <div className="space-y-6">
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">Shops</h2>
            <span className="text-muted-foreground text-xs tabular-nums">
              {selected.length} of {MAX_SELECTED}
            </span>
          </div>

          {candidates.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
              No shops have registered yet. When one does, it appears here.
            </p>
          ) : (
            <ul className="divide-border max-h-96 divide-y overflow-y-auto rounded-lg border">
              {candidates.map((shop) => {
                const slot = selected.indexOf(shop.id);
                const isSelected = slot > -1;
                return (
                  <li
                    key={shop.id}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5',
                      isSelected && 'bg-primary/5',
                    )}
                  >
                    <Checkbox
                      id={`shop-${shop.id}`}
                      checked={isSelected}
                      onCheckedChange={() => toggle(shop.id)}
                    />
                    <Label
                      htmlFor={`shop-${shop.id}`}
                      className="min-w-0 flex-1 cursor-pointer font-normal"
                    >
                      <span className="block truncate text-sm font-medium">
                        {shop.shop_name.trim()}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {/* Nullable in the schema. "Date unknown" beats
                            "Invalid Date", which is what `new Date(null)`
                            renders. */}
                        {shop.created_at
                          ? new Date(shop.created_at).toLocaleDateString(
                              'en-PH',
                              {
                                timeZone: 'Asia/Manila',
                                day: 'numeric',
                                month: 'short',
                              },
                            )
                          : 'Date unknown'}
                      </span>
                    </Label>
                    {!shop.logo_url && (
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        No logo
                      </Badge>
                    )}
                    {/* Which card this becomes. The route renders ids in
                        order, so the position is real information. */}
                    {isSelected && (
                      <Badge className="shrink-0 text-xs">
                        {slot === 0 ? 'Left' : 'Right'}
                      </Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {selected.length === MAX_SELECTED && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setSelected((current) => [...current].reverse())}
            >
              <ArrowLeftRight className="mr-2 h-4 w-4" />
              Swap sides
            </Button>
          )}

          {selected.length > 0 && (
            <div className="space-y-2.5 rounded-lg border p-3">
              <div>
                <p className="text-xs font-medium">Show the shop name</p>
                <p className="text-muted-foreground text-xs">
                  Turn off when the logo already says it.
                </p>
              </div>
              {selected.map((id, index) => {
                const shop = byId.get(id);
                if (!shop) return null;
                return (
                  <div key={id} className="flex items-center gap-2">
                    <Checkbox
                      id={`name-${id}`}
                      checked={!hidden.includes(id)}
                      onCheckedChange={() => toggleName(id)}
                    />
                    <Label
                      htmlFor={`name-${id}`}
                      className="min-w-0 cursor-pointer text-xs font-normal"
                    >
                      <span className="text-muted-foreground">
                        {SLOT_LABELS[index]} ·{' '}
                      </span>
                      {shop.shop_name.trim()}
                    </Label>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <Separator />

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Size</h2>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(POST_RATIOS) as PostRatio[]).map((value) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={ratio === value ? 'default' : 'outline'}
                onClick={() => setRatio(value)}
              >
                {POST_RATIOS[value].label}
              </Button>
            ))}
          </div>
          <p className="text-muted-foreground text-xs">{RATIO_HINTS[ratio]}</p>
        </section>

        <Separator />

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Text size</h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={scalesAreDefault}
              onClick={() => setScales(DEFAULT_TEXT_SCALES)}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset
            </Button>
          </div>

          {/* Driven by the zone record, so a third zone is an entry there
              rather than another copy of this block. */}
          {(Object.keys(TEXT_SCALES) as TextScaleKey[]).map((key) => (
            <div key={key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor={`scale-${key}`} className="text-xs font-medium">
                  {TEXT_SCALES[key].label}
                </Label>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {Math.round(scales[key] * 100)}%
                </span>
              </div>
              <input
                id={`scale-${key}`}
                type="range"
                min={SCALE_MIN}
                max={SCALE_MAX}
                step={0.05}
                value={scales[key]}
                // The readout beside it is a percentage; without this the
                // slider announces `1.15`, a number that appears nowhere on
                // screen.
                aria-valuetext={`${Math.round(scales[key] * 100)}%`}
                aria-describedby={`scale-${key}-hint`}
                onChange={(event) =>
                  setScales((current) => ({
                    ...current,
                    [key]: Number(event.target.value),
                  }))
                }
                className="accent-primary focus-visible:ring-ring w-full focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden"
              />
              <p
                id={`scale-${key}-hint`}
                className="text-muted-foreground text-xs"
              >
                {TEXT_SCALES[key].hint}
              </p>
            </div>
          ))}
        </section>
      </div>

      {/* ── The post: mounted, not embedded — and pinned.
             Sticky so the preview stays put while the rail scrolls: the text
             sliders sit below the shop list, and adjusting a size you cannot
             see the effect of is the one thing this page must not do.

             `self-start` is load-bearing. A grid item stretches to the row
             height by default, which leaves it nowhere to stick to — it is
             already as tall as the thing it would stick within.

             Sticky resolves against the nearest SCROLLING ancestor, which here
             is the admin shell's `overflow-auto` content div rather than the
             page (the shell is `h-screen overflow-hidden`). `top-0` is
             therefore the top of that pane.

             Only from `xl`: below it the layout is one column and the preview
             sits under the controls, where pinning it would cover them. ── */}
      <div className="space-y-4 xl:sticky xl:top-0 xl:self-start">
        {/* The action sits ABOVE the post, not below it.
            A 4:5 preview is taller than the fold, so a button underneath had
            to be scrolled to — and the column is pinned, so scrolling the rail
            never brings it back. Up here it rides the sticky column and is
            always reachable, while staying adjacent to the thing it acts on
            rather than being hoisted into the page header. */}
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold">Preview</h2>
          <Button
            type="button"
            onClick={download}
            disabled={!previewSrc || downloading}
            aria-busy={downloading}
          >
            {downloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Download className="mr-2 h-4 w-4" aria-hidden />
            )}
            {downloading
              ? 'Preparing…'
              : previewSrc
                ? `Download ${POST_RATIOS[ratio].label}`
                : 'Download'}
          </Button>
        </div>

        {downloadError && (
          <p
            role="alert"
            className="text-destructive rounded-lg border border-dashed p-3 text-xs"
          >
            The download didn’t complete. Try again — the preview above is
            unaffected.
          </p>
        )}

        {!brandFontAvailable && (
          <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-xs">
            Rendering with a fallback typeface — the brand font is only
            available as <code>.woff2</code>, which the image renderer cannot
            read. Add a static <code>Pally-Bold.otf</code> or <code>.ttf</code>{' '}
            to <code>assets/fonts/</code>.
          </p>
        )}

        {/* The mount HUGS the post rather than boxing it.
            `w-fit` on a flex container plus an image bounded by viewport
            height means the frame is exactly the post's size at either ratio —
            no letterboxing at 1:1, no overflow at 4:5.

            The previous version fixed the frame and tried to fit the image
            inside it with `max-h-full`, which silently did nothing: the
            wrapper between them was `w-full` with AUTO height, so there was no
            definite height for the percentage to resolve against, and the 4:5
            post spilled straight out of the border. A `min-h` fighting a
            `max-h` on the same element made it worse on short viewports. */}
        <div className="bg-muted/40 mx-auto flex w-fit items-center justify-center rounded-xl border p-4 sm:p-6">
          {previewSrc ? (
            <div className="relative">
              {status === 'error' ? (
                <div
                  // The loading state announces through `role="status"`; the
                  // panel that REPLACES it needs its own live region or a
                  // failed render is silent for assistive tech.
                  role="alert"
                  className="text-muted-foreground bg-background flex aspect-square w-100 max-w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm"
                >
                  <TriangleAlert className="h-5 w-5" aria-hidden />
                  <p className="font-medium">We couldn’t render this post.</p>
                  <p className="text-xs">
                    One of the logos may be unreachable. Try a different shop,
                    or reload.
                  </p>
                </div>
              ) : (
                <>
                  {status === 'loading' && (
                    <div
                      className="bg-muted/60 absolute inset-0 z-10 flex items-center justify-center rounded-lg"
                      role="status"
                    >
                      <Loader2
                        className="text-muted-foreground h-6 w-6 animate-spin"
                        aria-hidden
                      />
                      <span className="sr-only">Rendering the post</span>
                    </div>
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    key={previewSrc}
                    ref={captureIfAlreadyLoaded}
                    src={previewSrc}
                    alt="Welcome post preview"
                    // The INTRINSIC size, so the browser reserves the right
                    // box before the PNG arrives. Without it the wrapper is
                    // ~0x0 during the multi-second first render and the
                    // `absolute inset-0` spinner has nothing to fill.
                    width={POST_RATIOS[ratio].width}
                    height={POST_RATIOS[ratio].height}
                    // Height is the binding constraint in a pinned column:
                    // the post must fit beneath the toolbar without pushing
                    // itself off a screen that cannot be scrolled once the
                    // column sticks.
                    className="block h-auto max-h-[calc(100dvh-16rem)] w-auto max-w-full rounded-lg shadow-xl"
                    onLoad={() => setLoadedSrc(previewSrc)}
                    onError={() => setFailedSrc(previewSrc)}
                  />
                </>
              )}
            </div>
          ) : (
            <div className="text-muted-foreground flex size-100 max-w-full flex-col items-center justify-center gap-3 text-center">
              <ImageIcon className="h-6 w-6" aria-hidden />
              <div>
                <p className="text-sm font-medium">Nothing selected yet</p>
                <p className="text-xs">
                  Pick a shop and the post appears here.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
