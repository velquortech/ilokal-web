// @vitest-environment happy-dom

/**
 * The composer's behaviour.
 *
 * Not the layout — that needs eyes. What is testable and worth pinning is the
 * set of things that are wrong in a way nobody notices: a preview that refetches
 * per slider pixel, a download link that navigates when there is nothing to
 * download, and a card order the admin cannot predict or change.
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PostComposer } from '../components/post-composer';
import type { WelcomePostCandidate } from '@/lib/api/admin/analyticsQuery';

const SHOPS: WelcomePostCandidate[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    shop_name: 'Suds & Sips Carwash and Café ',
    logo_url: 'a/logo.webp',
    created_at: '2026-08-06T00:00:00Z',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    shop_name: 'LU2',
    logo_url: null,
    created_at: '2026-08-05T00:00:00Z',
  },
];

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.useFakeTimers();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

function render(initialIds: string[] = []) {
  act(() => {
    root.render(
      <PostComposer
        candidates={SHOPS}
        initialIds={initialIds}
        brandFontAvailable
      />,
    );
  });
}

const preview = () =>
  container.querySelector<HTMLImageElement>('img[alt="Welcome post preview"]');

/**
 * The preview URL, decoded.
 *
 * `URLSearchParams` percent-encodes the comma in `ids`, which the route decodes
 * on the way back in — so assertions read the decoded form rather than pinning
 * an encoding detail.
 */
const previewSrc = () =>
  decodeURIComponent(preview()?.getAttribute('src') ?? '');

const checkboxFor = (id: string) =>
  container.querySelector<HTMLElement>(`#shop-${id}`)!;

function click(el: Element) {
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

function buttonWith(text: RegExp) {
  return Array.from(container.querySelectorAll('button')).find((b) =>
    text.test(b.textContent ?? ''),
  );
}

describe('nothing selected', () => {
  it('offers no download link at all', () => {
    // `aria-disabled` on an anchor stops nothing — it still navigates. With
    // nothing to download there must be no anchor.
    render();

    expect(container.querySelector('a[href*="welcome-post"]')).toBeNull();
    const download = buttonWith(/Download/);
    expect(download).toBeTruthy();
    expect(download).toHaveProperty('disabled', true);
  });

  it('invites the admin to act rather than showing an empty frame', () => {
    render();
    expect(container.textContent).toContain('Nothing selected yet');
    expect(preview()).toBeNull();
  });
});

describe('selection order is the card order', () => {
  it('marks the first pick Left and the second Right', () => {
    // The route renders `ids` in order, so an admin needs to see which shop
    // lands where before the image comes back.
    render();
    click(checkboxFor(SHOPS[1].id));
    click(checkboxFor(SHOPS[0].id));

    const rows = Array.from(container.querySelectorAll('li'));
    const luRow = rows.find((r) => r.textContent?.includes('LU2'));
    const sudsRow = rows.find((r) => r.textContent?.includes('Suds'));

    expect(luRow?.textContent).toContain('Left');
    expect(sudsRow?.textContent).toContain('Right');
  });

  it('can swap the two without deselecting them', () => {
    render();
    click(checkboxFor(SHOPS[0].id));
    click(checkboxFor(SHOPS[1].id));

    const before = previewSrc();
    click(buttonWith(/Swap sides/)!);
    act(() => vi.advanceTimersByTime(400));

    const after = previewSrc();
    expect(after).not.toBe(before);
    expect(after).toContain(`${SHOPS[1].id},${SHOPS[0].id}`);
  });

  it('drops the oldest pick rather than ignoring a third click', () => {
    render();
    click(checkboxFor(SHOPS[0].id));
    click(checkboxFor(SHOPS[1].id));
    // Re-selecting the first after both are chosen keeps two, newest last.
    expect(previewSrc()).toContain(`${SHOPS[0].id},${SHOPS[1].id}`);
  });
});

describe('the preview does not refetch per slider pixel', () => {
  it('holds the request until the slider settles', () => {
    render([SHOPS[0].id]);
    act(() => vi.advanceTimersByTime(400));
    const before = preview()?.getAttribute('src');

    const slider = container.querySelector<HTMLInputElement>('#scale-name')!;
    const setValue = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )!.set!;

    // A drag: several changes in quick succession.
    for (const value of ['1.05', '1.15', '1.30']) {
      act(() => {
        setValue.call(slider, value);
        slider.dispatchEvent(new Event('input', { bubbles: true }));
      });
    }

    // Nothing has moved yet — the src is still the pre-drag one.
    expect(preview()?.getAttribute('src')).toBe(before);

    act(() => vi.advanceTimersByTime(400));

    const after = preview()?.getAttribute('src');
    expect(after).not.toBe(before);
    expect(after).toContain('nameScale=1.30');
  });

  it('omits a scale that is still at its default', () => {
    // A URL carrying every parameter at its default is noise, and it makes the
    // browser treat an unchanged post as a new image.
    render([SHOPS[0].id]);
    act(() => vi.advanceTimersByTime(400));

    const src = preview()?.getAttribute('src') ?? '';
    expect(src).not.toContain('nameScale');
    expect(src).not.toContain('footerScale');
  });

  it('has a slider for the footer as well as the name', () => {
    render([SHOPS[0].id]);
    expect(container.querySelector('#scale-name')).toBeTruthy();
    expect(container.querySelector('#scale-footer')).toBeTruthy();
  });
});

describe('a failed render is not an empty frame', () => {
  it('explains itself and stops showing a spinner', () => {
    render([SHOPS[0].id]);
    act(() => vi.advanceTimersByTime(400));

    act(() => {
      preview()!.dispatchEvent(new Event('error'));
    });

    expect(container.textContent).toContain('couldn’t render this post');
    expect(container.querySelector('[role="status"]')).toBeNull();
  });
});

describe('the preview stays put while the rail scrolls', () => {
  it('is sticky and does not stretch to the row height', () => {
    // A grid item stretches by default, which leaves it nowhere to stick to —
    // it is already as tall as the thing it would stick within. `self-start`
    // is what makes `sticky` mean anything here.
    render([SHOPS[0].id]);

    const column = container.querySelector('.xl\\:sticky');
    expect(column).toBeTruthy();
    expect(column?.className).toContain('xl:self-start');
    expect(column?.className).toContain('xl:top-0');
  });

  it('bounds the mount by viewport height, not only by width', () => {
    // A 4:5 post at full width pushes the download button below the fold of a
    // pinned column, where it can never be scrolled to.
    render([SHOPS[0].id]);

    const mount = container.querySelector('[class*="max-h-[calc(100dvh"]');
    expect(mount).toBeTruthy();
  });

  it('lets the image shrink to fit that bound instead of overflowing', () => {
    render([SHOPS[0].id]);
    act(() => vi.advanceTimersByTime(400));

    const img = preview();
    expect(img?.className).toContain('max-h-full');
    expect(img?.className).toContain('object-contain');
  });
});
