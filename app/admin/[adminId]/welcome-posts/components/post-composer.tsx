'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Download, ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WelcomePostCandidate } from '@/lib/api/admin/analyticsQuery';
import {
  NAME_SCALE_DEFAULT,
  NAME_SCALE_MAX,
  NAME_SCALE_MIN,
} from '@/lib/og/welcomePost';

const RATIOS = [
  {
    value: '1x1',
    label: 'Square 1:1',
    hint: 'Facebook · Instagram · Threads · LinkedIn',
  },
  {
    value: '4x5',
    label: 'Portrait 4:5',
    hint: 'More feed height on Instagram & Threads',
  },
] as const;

type Ratio = (typeof RATIOS)[number]['value'];

/** Two cards is what the template holds; a third would have nowhere to go. */
const MAX_SELECTED = 2;

interface PostComposerProps {
  candidates: WelcomePostCandidate[];
  /** Preselected from the dashboard prompt, so the click lands on real work. */
  initialIds: string[];
  /** False when the brand face is missing and the render falls back. */
  brandFontAvailable: boolean;
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
  const [ratio, setRatio] = React.useState<Ratio>('1x1');
  const [nameScale, setNameScale] = React.useState(NAME_SCALE_DEFAULT);
  const [loading, setLoading] = React.useState(false);

  const toggle = (id: string) => {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((x) => x !== id);
      // Oldest selection drops out rather than the click doing nothing — a
      // disabled checkbox at the cap reads as broken.
      const next = [...current, id];
      return next.slice(-MAX_SELECTED);
    });
  };

  const toggleName = (id: string) =>
    setHidden((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );

  const query = React.useMemo(() => {
    const params = new URLSearchParams({ ids: selected.join(','), ratio });
    const hide = hidden.filter((id) => selected.includes(id));
    if (hide.length) params.set('hideName', hide.join(','));
    if (nameScale !== NAME_SCALE_DEFAULT) {
      params.set('nameScale', nameScale.toFixed(2));
    }
    return params.toString();
  }, [selected, ratio, hidden, nameScale]);

  const previewSrc = selected.length
    ? `/api/admin/welcome-post?${query}`
    : null;

  // The preview is a plain <img>, so the browser owns fetching and caching. The
  // spinner is cleared by its own load/error events rather than a timer.
  React.useEffect(() => {
    if (previewSrc) setLoading(true);
  }, [previewSrc]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              Pick one or two shops ({selected.length}/{MAX_SELECTED})
            </p>
          </div>

          {candidates.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No shops to post about yet.
            </p>
          ) : (
            <ul className="divide-border max-h-125 divide-y overflow-y-auto rounded-lg border">
              {candidates.map((shop) => {
                const isSelected = selected.includes(shop.id);
                return (
                  <li
                    key={shop.id}
                    className={cn(
                      'flex items-center gap-3 p-3',
                      isSelected && 'bg-muted/50',
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
                          year: 'numeric',
                        })}
                      </span>
                    </Label>
                    {!shop.logo_url && (
                      <Badge variant="secondary" className="shrink-0">
                        No logo
                      </Badge>
                    )}
                    {isSelected && (
                      // Several of these logos are wordmarks that already carry
                      // the name; printing it twice looks like a mistake. The
                      // call is made per shop, against the render.
                      <div className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-xs">
                        <Checkbox
                          id={`name-${shop.id}`}
                          checked={!hidden.includes(shop.id)}
                          onCheckedChange={() => toggleName(shop.id)}
                        />
                        <Label
                          htmlFor={`name-${shop.id}`}
                          className="cursor-pointer text-xs font-normal"
                        >
                          Name
                        </Label>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">Size</p>
            <div className="flex flex-wrap gap-2">
              {RATIOS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  size="sm"
                  variant={ratio === option.value ? 'default' : 'outline'}
                  onClick={() => setRatio(option.value)}
                  title={option.hint}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            <p className="text-muted-foreground text-xs">
              {RATIOS.find((option) => option.value === ratio)?.hint}
            </p>
          </div>

          {/* The ladder picks a size from the name's length, but how big a name
              should look depends on the logo above it — which no rule knows.
              This is the override. */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="name-scale" className="text-sm font-medium">
                Name size
              </Label>
              <span className="text-muted-foreground text-xs tabular-nums">
                {Math.round(nameScale * 100)}%
              </span>
            </div>
            <input
              id="name-scale"
              type="range"
              min={NAME_SCALE_MIN}
              max={NAME_SCALE_MAX}
              step={0.05}
              value={nameScale}
              onChange={(event) => setNameScale(Number(event.target.value))}
              className="accent-primary w-full"
            />
            <p className="text-muted-foreground text-xs">
              Long names wrap to two lines. Reset to 100% for the automatic
              size.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <p className="text-sm font-medium">Preview</p>

          {!brandFontAvailable && (
            <p className="text-muted-foreground rounded-md border border-dashed p-3 text-xs">
              Rendering with a fallback typeface — the brand font is only
              available as <code>.woff2</code>, which the image renderer cannot
              read. Drop a <code>Pally-Bold.ttf</code> into{' '}
              <code>assets/fonts/</code> and this corrects itself.
            </p>
          )}

          {previewSrc ? (
            <div className="relative overflow-hidden rounded-lg border">
              {loading && (
                <div className="bg-muted/60 absolute inset-0 flex items-center justify-center">
                  <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
                </div>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={previewSrc}
                src={previewSrc}
                alt="Welcome post preview"
                className="w-full"
                onLoad={() => setLoading(false)}
                onError={() => setLoading(false)}
              />
            </div>
          ) : (
            <div className="text-muted-foreground flex aspect-square items-center justify-center rounded-lg border border-dashed text-sm">
              <span className="flex flex-col items-center gap-2">
                <ImageIcon className="h-5 w-5" aria-hidden />
                Pick a shop to see the post
              </span>
            </div>
          )}

          <Button asChild disabled={!previewSrc} className="w-full">
            <a
              href={previewSrc ? `${previewSrc}&download=1` : '#'}
              aria-disabled={!previewSrc}
            >
              <Download className="mr-2 h-4 w-4" />
              Download PNG
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
