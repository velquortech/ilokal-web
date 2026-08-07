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
import type { WelcomePostCandidate } from '@/lib/api/admin/analyticsQuery';
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
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'error'>(
    'idle',
  );

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

  React.useEffect(() => {
    if (previewSrc) setStatus('loading');
  }, [previewSrc]);

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
                        {new Date(shop.created_at).toLocaleDateString('en-PH', {
                          timeZone: 'Asia/Manila',
                          day: 'numeric',
                          month: 'short',
                        })}
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

      {/* ── The post: mounted, not embedded. ── */}
      <div className="space-y-4">
        {!brandFontAvailable && (
          <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-xs">
            Rendering with a fallback typeface — the brand font is only
            available as <code>.woff2</code>, which the image renderer cannot
            read. Add a static <code>Pally-Bold.otf</code> or <code>.ttf</code>{' '}
            to <code>assets/fonts/</code>.
          </p>
        )}

        <div className="bg-muted/40 flex min-h-125 items-center justify-center rounded-xl border p-6 sm:p-10">
          {previewSrc ? (
            <div className="relative w-full max-w-125">
              {status === 'error' ? (
                <div className="text-muted-foreground bg-background flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm">
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
                    src={previewSrc}
                    alt="Welcome post preview"
                    className="w-full rounded-lg shadow-xl"
                    onLoad={() => setStatus('idle')}
                    onError={() => setStatus('error')}
                  />
                </>
              )}
            </div>
          ) : (
            <div className="text-muted-foreground flex flex-col items-center gap-3 text-center">
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

        {/* An anchor with `aria-disabled` still navigates, so with nothing to
            download there is no anchor at all. */}
        {previewSrc ? (
          <Button asChild size="lg" className="w-full sm:w-auto">
            <a href={`${previewSrc}&download=1`} download>
              <Download className="mr-2 h-4 w-4" />
              Download {POST_RATIOS[ratio].label}
            </a>
          </Button>
        ) : (
          <Button size="lg" className="w-full sm:w-auto" disabled>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        )}
      </div>
    </div>
  );
}
