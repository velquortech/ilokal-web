// @vitest-environment happy-dom

/**
 * AddProductDialog — the Category picker's clear contract. The field is
 * optional, and the "No category" sentinel gives it the same un-pick that the
 * Update dialog offers: pick a category, change your mind, pick "No category"
 * again and the value is back to null. These tests pin that contract: the
 * sentinel renders first in the list, selecting a category swaps the trigger's
 * value, and selecting "No category" clears it back.
 *
 * react-dom/client + happy-dom per repo convention (no @testing-library).
 * Radix renders into a portal, so assertions read `document.body`.
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  beforeAll,
} from 'vitest';

const { actions } = vi.hoisted(() => ({
  actions: {
    createProductAction: vi.fn(),
    uploadProductImageAction: vi.fn(),
  },
}));

vi.mock('@/app/business/[businessId]/actions/productActions', () => actions);

vi.mock('@/providers/BusinessProvider', () => ({
  useBusinessShop: () => ({ selectedBranchId: null }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

import { AddProductDialog } from '../add-product';
import type { Category } from '@/lib/types';

const CATEGORIES: Category[] = [
  {
    id: 'cat-services',
    name: 'Computer / Internet Shop',
    slug: 'computer-internet-shop',
    description: null,
    created_at: '',
    updated_at: '',
    business_type_id: 'type-services',
    // NULL kind = offered for either — survives the default vocabulary's
    // kind scoping (defaultKind 'product'), so the fixture always renders.
    kind: null,
  },
  {
    id: 'cat-global',
    name: 'Health & Beauty',
    slug: 'health-beauty',
    description: null,
    created_at: '',
    updated_at: '',
    business_type_id: null,
    kind: null,
  },
];

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  actions.createProductAction.mockReset().mockResolvedValue({
    success: true,
    data: { id: 'product-1' },
  });
  actions.uploadProductImageAction.mockReset().mockResolvedValue({
    success: true,
    data: { url: 'https://cdn/x.webp' },
  });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function renderOpen() {
  act(() => {
    root.render(
      <AddProductDialog open categories={CATEGORIES}>
        <button type="button">Add product</button>
      </AddProductDialog>,
    );
  });
}

/**
 * The category picker's trigger — a Radix combobox whose value is one of the
 * picker's own labels (the "No category" sentinel, or a picked category). The
 * price-type combobox next to it never matches these texts.
 */
function categoryTrigger(): HTMLButtonElement {
  return Array.from(document.querySelectorAll('button')).find(
    (b) =>
      b.getAttribute('role') === 'combobox' &&
      ['No category', 'Computer / Internet Shop', 'Health & Beauty'].includes(
        b.textContent?.trim() ?? '',
      ),
  ) as HTMLButtonElement;
}

function openCategoryPicker() {
  act(() => {
    const trigger = categoryTrigger();
    trigger.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, button: 0 }),
    );
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  return Array.from(document.querySelectorAll('[role="option"]'));
}

function pickOption(el: Element) {
  act(() => {
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

describe('AddProductDialog category picker', () => {
  it('offers "No category" ahead of the real options', () => {
    renderOpen();
    const options = openCategoryPicker();
    expect(options[0]?.textContent?.trim()).toBe('No category');
    expect(options.map((o) => o.textContent?.trim())).toEqual(
      expect.arrayContaining(['Computer / Internet Shop', 'Health & Beauty']),
    );
  });

  it('clears a picked category back to "No category" when the sentinel is chosen', () => {
    renderOpen();
    const options = openCategoryPicker();
    pickOption(
      options.find((o) => o.textContent === 'Computer / Internet Shop')!,
    );
    // The trigger now shows the picked category.
    expect(
      Array.from(document.querySelectorAll('button')).some((b) =>
        b.textContent?.trim().includes('Computer / Internet Shop'),
      ),
    ).toBe(true);

    const reopened = openCategoryPicker();
    pickOption(reopened.find((o) => o.textContent === 'No category')!);
    // The trigger is back to the sentinel — no category chosen.
    expect(categoryTrigger()).toBeDefined();
    expect(
      Array.from(document.querySelectorAll('button')).some((b) =>
        b.textContent?.trim().includes('Computer / Internet Shop'),
      ),
    ).toBe(false);
  });

  it('submits category_id: null when no category is chosen', async () => {
    renderOpen();
    const nameInput = Array.from(document.querySelectorAll('input')).find(
      (i) => i.getAttribute('placeholder') === 'e.g. Flat White',
    )!;
    // RHF's onChange tracks the native setter, not direct `.value` assignment.
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )!.set!;
    const priceInput = Array.from(document.querySelectorAll('input')).find(
      (i) => i.getAttribute('placeholder') === '0.00',
    )!;
    await act(async () => {
      setter.call(nameInput, 'PC rental');
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      setter.call(priceInput, '99');
      priceInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    // The DialogContent portals to document.body — the form is not inside
    // `container`.
    const form = document.querySelector('form')!;
    await act(async () => {
      form.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      );
      // React Hook Form validates and calls onSubmit asynchronously.
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(actions.createProductAction).toHaveBeenCalledWith(
      expect.objectContaining({ category_id: null }),
    );
  });
});
