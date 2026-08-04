'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSidebar } from '@/components/ui/sidebar';
import {
  tourAnchorSelector,
  type ResolvedTourStep,
  type TourStepId,
} from '@/lib/onboarding/tourSteps';

/**
 * Long enough for the sidebar's open transition and a dialog's mount animation
 * to finish before anything is measured. Measuring inside an animating
 * container returns a stale box — the `LocationPicker` lesson, which shipped a
 * grey band where a map should have been.
 */
const SETTLE_MS = 380;

/** Stop the measure loop once the box has held still this many frames. */
const STABLE_FRAMES = 20;

function anchorElement(id: TourStepId): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.querySelector<HTMLElement>(tourAnchorSelector(id));
}

function isPaintable(el: HTMLElement | null): el is HTMLElement {
  if (!el) return false;
  const { width, height } = el.getBoundingClientRect();
  return width > 0 && height > 0;
}

/**
 * The current anchor's viewport box, kept current without polling forever.
 *
 * A `ResizeObserver` alone is not enough: the box also moves when an ancestor
 * scrolls, and the dashboard's content is its own scroll container, so the
 * scroll listener is registered in the CAPTURE phase to see it.
 */
function useAnchorRect(id: TourStepId | null): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!id || typeof window === 'undefined') {
      setRect(null);
      return;
    }

    let frame = 0;
    let stable = 0;
    let last = '';

    const measure = () => {
      frame = 0;
      const next = anchorElement(id)?.getBoundingClientRect() ?? null;
      const key = next
        ? `${next.x}|${next.y}|${next.width}|${next.height}`
        : 'none';

      if (key !== last) {
        last = key;
        stable = 0;
        setRect(next);
      } else {
        stable += 1;
      }

      if (stable < STABLE_FRAMES) frame = requestAnimationFrame(measure);
    };

    const restart = () => {
      stable = 0;
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();

    window.addEventListener('scroll', restart, true);
    window.addEventListener('resize', restart);

    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(restart)
        : null;
    observer?.observe(document.documentElement);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', restart, true);
      window.removeEventListener('resize', restart);
      observer?.disconnect();
    };
  }, [id]);

  return rect;
}

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * An anchor taller or wider than this share of the viewport gets a POINT
 * anchor instead of its own box (see `useAnchorGeometry`).
 */
const OVERSIZE_RATIO = 0.5;

/**
 * The visible part of the anchor, and a box the step card can actually be
 * positioned against.
 *
 * Two separate jobs, which is why they are separate boxes:
 *
 * - **The highlight** is clipped to the viewport. An anchor that starts above
 *   the fold or runs past the bottom would otherwise draw its ring off-screen.
 * - **The popover anchor** is the same box only while the element is SMALL. The
 *   setup checklist is ~680px tall and nearly full width; against a box that
 *   size there is no side with room for a 320px card, so Radix flips it to the
 *   top and it lands above the viewport — cut off at the browser edge with only
 *   its buttons showing, which is exactly what shipped. For those, the anchor
 *   collapses to a zero-size POINT at the bottom-centre of the visible area and
 *   the card opens upward from there, over the element it is describing but
 *   always inside the window.
 */
function useAnchorGeometry(rect: DOMRect | null): {
  highlight: Box | null;
  anchor: Box | null;
  oversized: boolean;
} {
  return useMemo(() => {
    if (!rect || typeof window === 'undefined') {
      return { highlight: null, anchor: null, oversized: false };
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const left = Math.max(0, Math.min(rect.left, vw));
    const top = Math.max(0, Math.min(rect.top, vh));
    const right = Math.max(0, Math.min(rect.right, vw));
    const bottom = Math.max(0, Math.min(rect.bottom, vh));
    const width = right - left;
    const height = bottom - top;

    // Scrolled entirely out of view: no ring, and no anchor to hang a card on.
    if (width <= 0 || height <= 0) {
      return { highlight: null, anchor: null, oversized: false };
    }

    const highlight: Box = { left, top, width, height };
    const oversized =
      height > vh * OVERSIZE_RATIO || width > vw * OVERSIZE_RATIO;

    if (!oversized) return { highlight, anchor: highlight, oversized };

    return {
      highlight,
      anchor: {
        left: left + width / 2,
        top: Math.max(0, top + height - 8),
        width: 0,
        height: 0,
      },
      oversized: true,
    };
  }, [rect]);
}

export function TourOverlay({
  steps,
  onFinish,
  onSkip,
}: {
  /** Already flag-filtered and copy-resolved. */
  steps: ResolvedTourStep[];
  onFinish: () => void;
  onSkip: () => void;
}) {
  const { isMobile, open, setOpen } = useSidebar();

  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState<ResolvedTourStep[]>([]);
  const [ready, setReady] = useState(false);

  // The sidebar is `defaultOpen={false}`, so three of the anchors are icons
  // when the tour starts. Open it, and put it back exactly as it was on the way
  // out — an owner who works with it collapsed should not find it expanded
  // because they watched a tour.
  const restoreSidebar = useRef(open);
  useEffect(() => {
    if (isMobile) return;
    const previous = restoreSidebar.current;
    setOpen(true);
    return () => setOpen(previous);
    // Deliberately keyed on `isMobile` alone: re-running on `open` would fight
    // the user, and `setOpen` is recreated whenever `open` changes, which is
    // the same thing by another name.
  }, [isMobile]);

  /**
   * The visible set is decided ONCE, after the shell has settled, rather than
   * per paint. A step whose anchor is missing or zero-sized (the branch
   * switcher below `md`, the bell below `sm`) is dropped here, so it never
   * counts toward "step 3 of 6" either — a spotlight pointing at (0,0) and a
   * step count that skips numbers are both worse than the step's absence.
   */
  useEffect(() => {
    if (isMobile) {
      setVisible(steps);
      setReady(true);
      return;
    }

    const timer = setTimeout(() => {
      setVisible(steps.filter((step) => isPaintable(anchorElement(step.id))));
      setReady(true);
    }, SETTLE_MS);

    return () => clearTimeout(timer);
  }, [steps, isMobile]);

  const current = visible[index];
  const rect = useAnchorRect(isMobile ? null : (current?.id ?? null));
  const { highlight, anchor, oversized } = useAnchorGeometry(rect);

  // Nothing to point at — end quietly rather than paint a dimmed screen with an
  // empty card on it.
  useEffect(() => {
    if (ready && visible.length === 0) onSkip();
  }, [ready, visible.length, onSkip]);

  // Bring the anchor into view before it is highlighted. `block: 'center'`
  // because a highlight flush against the viewport edge leaves no room for the
  // card that explains it.
  useEffect(() => {
    if (isMobile || !current) return;
    const el = anchorElement(current.id);
    if (!el) return;

    const reduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    el.scrollIntoView({
      block: 'center',
      inline: 'nearest',
      behavior: reduced ? 'auto' : 'smooth',
    });
  }, [current, isMobile]);

  const next = useCallback(() => {
    setIndex((i) => {
      if (i + 1 >= visible.length) {
        onFinish();
        return i;
      }
      return i + 1;
    });
  }, [visible.length, onFinish]);

  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  if (!ready) return null;

  // Mobile: a list, not a spotlight. The sidebar is a `Sheet` that is not in
  // the DOM until opened, and half these anchors are hidden at that width — a
  // spotlight there would point at nothing, and a broken spotlight is worse
  // than no spotlight.
  if (isMobile) {
    return (
      <Dialog open onOpenChange={(o) => !o && onSkip()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>A quick tour of your dashboard</DialogTitle>
            <DialogDescription>
              Where everything lives. Open the menu (top left) to reach any of
              these.
            </DialogDescription>
          </DialogHeader>
          <ol className="divide-border divide-y">
            {visible.map((step, i) => (
              <li key={step.id} className="flex gap-3 py-3">
                <span
                  aria-hidden
                  className="bg-muted text-muted-foreground mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium"
                >
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">
                    {step.title}
                  </span>
                  <span className="text-muted-foreground block text-sm">
                    {step.body}
                  </span>
                </span>
              </li>
            ))}
          </ol>
          <DialogFooter>
            <Button onClick={onFinish}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (!current) return null;

  const isLast = index === visible.length - 1;

  return (
    <Popover open modal onOpenChange={(o) => !o && onSkip()}>
      {/* The highlight: one fixed box cutting a hole in the dim layer with an
          outward box-shadow (not a filter — no per-frame repaint of the
          viewport). Clipped to the viewport, so an anchor running past the fold
          does not draw its ring off-screen. */}
      <div
        aria-hidden
        className="ring-primary pointer-events-none fixed z-50 rounded-lg ring-2 motion-safe:transition-all motion-safe:duration-200"
        style={{
          left: highlight?.left ?? 0,
          top: highlight?.top ?? 0,
          width: highlight?.width ?? 0,
          height: highlight?.height ?? 0,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
        }}
      />

      {/* A SEPARATE anchor from the highlight, because the two want different
          boxes. For a small element they are the same rect; for something the
          size of the setup card this collapses to a point, or the card gets
          flipped clean out of the window. */}
      <PopoverAnchor asChild>
        <div
          aria-hidden
          className="pointer-events-none fixed"
          style={{
            left: anchor?.left ?? 0,
            top: anchor?.top ?? 0,
            width: anchor?.width ?? 0,
            height: anchor?.height ?? 0,
          }}
        />
      </PopoverAnchor>

      <PopoverContent
        side={oversized ? 'top' : current.side}
        align={oversized ? 'center' : 'start'}
        sideOffset={oversized ? 16 : 12}
        collisionPadding={16}
        // `sticky="always"` keeps the card against the anchor while the page
        // scrolls; the max-height is the last line of defence — a card taller
        // than the window would otherwise push its own buttons off the edge,
        // which is how the first version showed nothing but Skip and Next.
        sticky="always"
        className="z-50 max-h-[calc(100dvh-2rem)] w-80 overflow-y-auto"
        aria-label="Dashboard tour"
      >
        {/* One announcement per step: the whole block is the live region, so a
            screen reader hears the new step once instead of the title and the
            body arriving as two separate updates. */}
        <div aria-live="polite" aria-atomic="true" className="space-y-1">
          <p className="text-muted-foreground text-xs font-medium">
            Step {index + 1} of {visible.length}
          </p>
          <p className="text-sm font-semibold">{current.title}</p>
          <p className="text-muted-foreground text-sm">{current.body}</p>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={onSkip}>
            Skip
          </Button>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <Button variant="outline" size="sm" onClick={back}>
                Back
              </Button>
            )}
            <Button size="sm" onClick={isLast ? onFinish : next}>
              {isLast ? 'Done' : 'Next'}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
