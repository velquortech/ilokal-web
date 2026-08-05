// @vitest-environment happy-dom

/**
 * The spotlight.
 *
 * The behaviours worth pinning are the ones that produce a visibly broken tour:
 * a step whose anchor is not on screen must be DROPPED (not pointed at (0,0),
 * and not counted in "step 3 of 6"), a tour with nothing to point at must end
 * rather than dim the page over an empty card, and the sidebar must be put back
 * exactly as the owner had it.
 *
 * `react-dom/client` + happy-dom, per repo convention.
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TourOverlay } from '../TourOverlay';
import type { ResolvedTourStep } from '@/lib/onboarding/tourSteps';

const sidebar = {
  isMobile: false,
  open: false,
  setOpen: vi.fn(),
  openMobile: false,
  setOpenMobile: vi.fn(),
  state: 'collapsed' as const,
  toggleSidebar: vi.fn(),
};

vi.mock('@/components/ui/sidebar', () => ({
  useSidebar: () => sidebar,
}));

const step = (id: string, extra: Partial<ResolvedTourStep> = {}) =>
  ({
    id,
    title: `Title ${id}`,
    body: `Body ${id}`,
    side: 'right',
    inSidebar: false,
    ...extra,
  }) as ResolvedTourStep;

let container: HTMLDivElement;
let root: Root;

interface FakeRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const SMALL: FakeRect = { left: 10, top: 20, width: 40, height: 40 };

/** Only the ids listed here measure as painted; everything else is 0×0. */
function paintAnchors(ids: string[], rect: FakeRect = SMALL) {
  const anchors: HTMLElement[] = [];
  for (const id of ids) {
    const el = document.createElement('div');
    el.setAttribute('data-tour', id);
    document.body.appendChild(el);
    anchors.push(el);
  }

  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: Element) {
      const painted =
        this instanceof HTMLElement &&
        anchors.includes(this) &&
        ids.includes(this.getAttribute('data-tour') ?? '');
      const box = painted ? rect : { left: 0, top: 0, width: 0, height: 0 };
      return {
        x: box.left,
        y: box.top,
        top: box.top,
        left: box.left,
        right: box.left + box.width,
        bottom: box.top + box.height,
        width: box.width,
        height: box.height,
        toJSON: () => ({}),
      } as DOMRect;
    },
  );
}

/** The dimming ring; the other `aria-hidden` fixed div is the popover anchor. */
const highlightBox = () =>
  document.querySelector<HTMLElement>('[aria-hidden].ring-2')?.style;

const anchorBox = () =>
  Array.from(
    document.querySelectorAll<HTMLElement>('[aria-hidden].fixed'),
  ).find((el) => !el.classList.contains('ring-2'))?.style;

/** An anchor the tour must ignore: present in the DOM, but 0×0. */
function addHiddenAnchor(id: string) {
  const el = document.createElement('div');
  el.setAttribute('data-tour', id);
  document.body.appendChild(el);
}

function render(ui: React.ReactElement) {
  act(() => {
    root.render(ui);
  });
  // Past the settle delay, so the visible set has been computed.
  act(() => {
    vi.advanceTimersByTime(500);
  });
}

const text = () => document.body.textContent ?? '';

const button = (label: string) =>
  Array.from(document.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === label,
  );

beforeEach(() => {
  vi.useFakeTimers();
  sidebar.isMobile = false;
  sidebar.open = false;
  sidebar.setOpen = vi.fn();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('TourOverlay', () => {
  it('drops a step whose anchor is not painted, and does not count it', () => {
    paintAnchors(['nav-catalogue']);
    addHiddenAnchor('branch-switcher'); // in the DOM, 0×0 below `md`

    render(
      <TourOverlay
        steps={[step('nav-catalogue'), step('branch-switcher')]}
        onFinish={vi.fn()}
        onSkip={vi.fn()}
        onAbort={vi.fn()}
      />,
    );

    expect(text()).toContain('Step 1 of 1');
    expect(text()).toContain('Title nav-catalogue');
    expect(text()).not.toContain('Title branch-switcher');
  });

  it('aborts — not skips — when there is nothing on screen to point at', () => {
    // `onSkip` settles: it writes the "seen" marker and posts the Server
    // Action. Using it here would record the tour as answered on a visit where
    // the owner saw nothing at all, and they would never be offered it again.
    paintAnchors([]);
    const onSkip = vi.fn();
    const onAbort = vi.fn();

    render(
      <TourOverlay
        steps={[step('nav-catalogue')]}
        onFinish={vi.fn()}
        onSkip={onSkip}
        onAbort={onAbort}
      />,
    );

    expect(onAbort).toHaveBeenCalledTimes(1);
    expect(onSkip).not.toHaveBeenCalled();
    expect(text()).not.toContain('Step 1 of');
  });

  it('walks forward and finishes on the last step', () => {
    paintAnchors(['a', 'b']);
    const onFinish = vi.fn();

    render(
      <TourOverlay
        steps={[step('a'), step('b')]}
        onFinish={onFinish}
        onSkip={vi.fn()}
        onAbort={vi.fn()}
      />,
    );

    expect(text()).toContain('Step 1 of 2');
    act(() => button('Next')?.click());
    expect(text()).toContain('Step 2 of 2');
    expect(button('Next')).toBeUndefined();

    act(() => button('Done')?.click());
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('goes back without leaving the tour', () => {
    paintAnchors(['a', 'b']);
    render(
      <TourOverlay
        steps={[step('a'), step('b')]}
        onFinish={vi.fn()}
        onSkip={vi.fn()}
        onAbort={vi.fn()}
      />,
    );

    act(() => button('Next')?.click());
    act(() => button('Back')?.click());
    expect(text()).toContain('Step 1 of 2');
    // Nothing to go back to on the first step.
    expect(button('Back')).toBeUndefined();
  });

  it('skips on demand', () => {
    paintAnchors(['a']);
    const onSkip = vi.fn();
    render(
      <TourOverlay
        steps={[step('a')]}
        onFinish={vi.fn()}
        onSkip={onSkip}
        onAbort={vi.fn()}
      />,
    );

    act(() => button('Skip')?.click());
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('does not end the tour when the owner clicks outside the card', () => {
    // `onSkip` SETTLES — marker written, Server Action posted, never offered
    // again. Routing Radix's outside-dismissal into it meant a pointer-down on
    // the very nav link the spotlight is pointing at consumed onboarding.
    paintAnchors(['a']);
    const onSkip = vi.fn();
    const onAbort = vi.fn();

    render(
      <TourOverlay
        steps={[step('a')]}
        onFinish={vi.fn()}
        onSkip={onSkip}
        onAbort={onAbort}
      />,
    );

    act(() => {
      document.body.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true }),
      );
    });

    expect(onSkip).not.toHaveBeenCalled();
    expect(onAbort).not.toHaveBeenCalled();
    // ...and the card is still there to carry on with.
    expect(text()).toContain('Step 1 of 1');
  });

  it('clamps the step index when the visible set shrinks', () => {
    // The visible set is recomputed whenever `steps` changes identity. An index
    // left past the end renders nothing while the phase stays 'running', at
    // which point `startTour()` is a no-op and the tour is dead until remount.
    paintAnchors(['a', 'b']);
    const onAbort = vi.fn();

    render(
      <TourOverlay
        steps={[step('a'), step('b')]}
        onFinish={vi.fn()}
        onSkip={vi.fn()}
        onAbort={onAbort}
      />,
    );
    act(() => button('Next')?.click());
    expect(text()).toContain('Step 2 of 2');

    // Same component, a shorter list — as a flag flip or a re-resolve produces.
    render(
      <TourOverlay
        steps={[step('a')]}
        onFinish={vi.fn()}
        onSkip={vi.fn()}
        onAbort={onAbort}
      />,
    );

    expect(text()).toContain('Step 1 of 1');
    expect(onAbort).not.toHaveBeenCalled();
  });

  it('opens the sidebar and restores the owner’s own state on exit', () => {
    paintAnchors(['a']);
    render(
      <TourOverlay
        steps={[step('a')]}
        onFinish={vi.fn()}
        onSkip={vi.fn()}
        onAbort={vi.fn()}
      />,
    );

    expect(sidebar.setOpen).toHaveBeenCalledWith(true);

    act(() => root.unmount());
    // Collapsed is how this owner had it; the tour must not leave it expanded.
    expect(sidebar.setOpen).toHaveBeenLastCalledWith(false);

    // The shared afterEach unmounts again; give it a live root to unmount.
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  it('announces the step once, as a single polite region', () => {
    paintAnchors(['a']);
    render(
      <TourOverlay
        steps={[step('a')]}
        onFinish={vi.fn()}
        onSkip={vi.fn()}
        onAbort={vi.fn()}
      />,
    );

    const live = document.querySelectorAll('[aria-live="polite"]');
    expect(live.length).toBe(1);
    expect(live[0].getAttribute('aria-atomic')).toBe('true');
    expect(live[0].textContent).toContain('Title a');
  });

  it('anchors a small element to its own box', () => {
    paintAnchors(['a']);
    render(
      <TourOverlay
        steps={[step('a')]}
        onFinish={vi.fn()}
        onSkip={vi.fn()}
        onAbort={vi.fn()}
      />,
    );

    // Nothing clever needed here: ring and anchor are the same rect.
    expect(highlightBox()?.width).toBe('40px');
    expect(anchorBox()?.width).toBe('40px');
    expect(anchorBox()?.height).toBe('40px');
  });

  it('collapses a viewport-sized anchor to a point, so the card cannot be flipped out of the window', () => {
    // The setup checklist is ~680px tall and nearly full width. Against a box
    // that size there is no side with room for the card, so Radix flipped it
    // above the viewport and it rendered cut off at the browser edge with only
    // Skip and Next visible. The ring still covers the element; the ANCHOR does
    // not.
    paintAnchors(['setup-checklist'], {
      left: 0,
      top: 0,
      width: 1000,
      height: 700,
    });

    render(
      <TourOverlay
        steps={[step('setup-checklist')]}
        onFinish={vi.fn()}
        onSkip={vi.fn()}
        onAbort={vi.fn()}
      />,
    );

    expect(highlightBox()?.height).toBe('700px');
    // 1px, not 0: floating-ui's autoUpdate skips its movement observer on a
    // zero-size reference, so a 0x0 anchor gets no reposition signal while the
    // measure loop moves it during the smooth scroll.
    expect(anchorBox()?.width).toBe('1px');
    expect(anchorBox()?.height).toBe('1px');
    // Bottom-centre of the visible area, so the card opens upward into the
    // window rather than off the top of it.
    expect(anchorBox()?.left).toBe('500px');
    expect(anchorBox()?.top).toBe('692px');
  });

  it('clips the ring to the viewport when the anchor runs past the fold', () => {
    // Half above the top edge: drawing the ring at a negative offset would put
    // it, and the card hanging off it, outside the window.
    paintAnchors(['a'], { left: -50, top: -100, width: 200, height: 200 });

    render(
      <TourOverlay
        steps={[step('a')]}
        onFinish={vi.fn()}
        onSkip={vi.fn()}
        onAbort={vi.fn()}
      />,
    );

    expect(highlightBox()?.top).toBe('0px');
    expect(highlightBox()?.left).toBe('0px');
    expect(highlightBox()?.height).toBe('100px');
    expect(highlightBox()?.width).toBe('150px');
  });

  it('falls back to a list on mobile, where a spotlight would point at nothing', () => {
    sidebar.isMobile = true;
    paintAnchors([]); // nothing measurable at that width

    render(
      <TourOverlay
        steps={[step('a'), step('b')]}
        onFinish={vi.fn()}
        onSkip={vi.fn()}
        onAbort={vi.fn()}
      />,
    );

    // Every step is listed, none is dropped for being unmeasurable...
    expect(text()).toContain('Title a');
    expect(text()).toContain('Title b');
    // ...and the sidebar is left alone: on mobile it is a Sheet.
    expect(sidebar.setOpen).not.toHaveBeenCalled();
    expect(document.querySelectorAll('ol > li').length).toBe(2);
  });
});
