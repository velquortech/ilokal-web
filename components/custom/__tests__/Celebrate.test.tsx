// @vitest-environment happy-dom

/**
 * The celebration.
 *
 * The point of these is the NEGATIVE cases. A burst that fires on a delete, or
 * on saving a draft, devalues every real one — so the contract is as much
 * about where it stays quiet as where it fires.
 *
 * Driven with react-dom/client + happy-dom per repo convention; the stack is
 * frozen and @testing-library/dom is not installed.
 */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { CelebrateProvider, useCelebrate } from '@/components/custom/Celebrate';

const ROOT = join(__dirname, '../../..');

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  // happy-dom has no canvas backend; the component only needs the calls to
  // land somewhere, not to rasterise.
  HTMLCanvasElement.prototype.getContext = vi.fn(
    () =>
      ({
        scale: vi.fn(),
        clearRect: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        fillRect: vi.fn(),
        set fillStyle(_v: string) {},
        set globalAlpha(_v: number) {},
      }) as unknown as CanvasRenderingContext2D,
  ) as unknown as HTMLCanvasElement['getContext'];
});

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function Trigger() {
  const celebrate = useCelebrate();
  return (
    <button type="button" onClick={celebrate}>
      go
    </button>
  );
}

function render(reduced: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduced && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
  })) as unknown as typeof window.matchMedia;

  act(() =>
    root.render(
      <CelebrateProvider>
        <Trigger />
      </CelebrateProvider>,
    ),
  );
  return container;
}

const fire = (el: HTMLElement) =>
  act(() =>
    el
      .querySelector('button')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true })),
  );

describe('CelebrateProvider', () => {
  it('paints nothing until something is actually celebrated', () => {
    expect(render(false).querySelector('canvas')).toBeNull();
  });

  it('mounts the canvas when a real outcome lands', () => {
    const el = render(false);
    fire(el);
    expect(el.querySelector('canvas')).not.toBeNull();
  });

  it('never lets the canvas swallow the click that triggered it', () => {
    const el = render(false);
    fire(el);
    const canvas = el.querySelector('canvas')!;
    // It covers the whole viewport at z-100. Without pointer-events-none the
    // celebration would block the UI it is celebrating.
    expect(canvas.className).toContain('pointer-events-none');
    expect(canvas.getAttribute('aria-hidden')).toBe('true');
  });

  it('stays silent under prefers-reduced-motion', () => {
    const el = render(true);
    fire(el);
    expect(el.querySelector('canvas')).toBeNull();
  });

  it('no-ops rather than throwing when no provider is mounted', () => {
    render(false);
    // Several dialogs are rendered in isolation by other tests and in Storybook
    // -like harnesses; calling celebrate() there must not explode.
    expect(() => act(() => root.render(<Trigger />))).not.toThrow();
    expect(() => fire(container)).not.toThrow();
  });
});

describe('where it is wired', () => {
  const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

  it('fires only for a PUBLISHED promo, never for a draft', () => {
    const src = read(
      'app/business/[businessId]/coupons/components/add-coupon.tsx',
    );
    expect(src).toMatch(/if \(live\) celebrate\(\)/);
  });

  it('is absent from every destructive path', () => {
    // The rule this encodes: confetti marks something gained, never something
    // removed. A burst over a deletion is a bug, not a delight.
    for (const p of [
      'app/business/[businessId]/coupons/components/delete-coupon.tsx',
      'app/business/[businessId]/product-catalogues/components/delete-product.tsx',
      'app/business/[businessId]/branches/components/delete-branch.tsx',
    ]) {
      expect(read(p)).not.toContain('celebrate');
    }
  });

  it('is absent from plain edits', () => {
    for (const p of [
      'app/business/[businessId]/coupons/components/update-coupon.tsx',
      'app/business/[businessId]/product-catalogues/components/update-product.tsx',
    ]) {
      expect(read(p)).not.toContain('celebrate');
    }
  });
});
