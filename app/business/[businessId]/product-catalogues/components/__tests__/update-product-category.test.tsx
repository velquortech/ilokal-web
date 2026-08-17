// @vitest-environment happy-dom

/**
 * UpdateProductDialog — the Category picker's clear contract. The category is
 * optional, and the "No category" sentinel gives it the same un-pick the Add
 * dialog offers: pick a category, change your mind, pick "No category" again
 * and the value is back to null — and the cleared value is ALWAYS sent on
 * update (omitting it would make moving an offering back to "no category"
 * impossible). These tests pin that contract: the sentinel renders first,
 * selecting a category swaps the trigger's value, and selecting "No category"
 * clears it back and submits `category_id: null`.
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
    updateProductAction: vi.fn(),
    uploadProductImageAction: vi.fn(),
  },
}));

vi.mock('@/app/business/[businessId]/actions/productActions', () => actions);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
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

import { UpdateProductDialog } from '../update-product';
import type { ProductResponse } from '@/lib/types';

const CATEGORIES = [
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

function makeProduct(
  overrides: Partial<ProductResponse> = {},
): ProductResponse {
  return {
    id: 'product-1',
    business_id: 'biz-1',
    branch_id: null,
    category_id: 'cat-services',
    section_id: null,
    kind: 'product',
    name: 'PC rental',
    description: null,
    price: 99,
    sale_price: null,
    sale_starts_at: null,
    sale_ends_at: null,
    price_type: 'fixed',
    price_unit: null,
    image_url: null,
    status: 'active',
    is_available: true,
    archived_at: null,
    created_at: '',
    updated_at: '',
    booking_mode: 'none',
    duration_minutes: null,
    lead_time_minutes: null,
    inventory_count: null,
    capacity: null,
    deposit_amount: null,
    min_duration_units: null,
    max_duration_units: null,
    service_location: 'at_business',
    category: CATEGORIES[0],
    section: null,
    ...overrides,
  };
}

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  actions.updateProductAction.mockReset().mockResolvedValue({
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

function renderAndOpen(product: ProductResponse) {
  act(() => {
    root.render(
      <UpdateProductDialog product={product} categories={CATEGORIES}>
        <button type="button">Edit product</button>
      </UpdateProductDialog>,
    );
  });
  const trigger = Array.from(document.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === 'Edit product',
  )!;
  act(() => {
    trigger.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, button: 0 }),
    );
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

/**
 * The category picker's trigger — a Radix combobox whose value is one of the
 * picker's own labels (the "No category" sentinel, or a picked category). The
 * section, price-type and status comboboxes next to it never match these
 * texts.
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

describe('UpdateProductDialog category picker', () => {
  it('offers "No category" ahead of the real options', () => {
    renderAndOpen(makeProduct());
    const options = openCategoryPicker();
    expect(options[0]?.textContent?.trim()).toBe('No category');
    expect(options.map((o) => o.textContent?.trim())).toEqual(
      expect.arrayContaining(['Computer / Internet Shop', 'Health & Beauty']),
    );
  });

  it('clears a picked category back to "No category" when the sentinel is chosen', () => {
    renderAndOpen(makeProduct());
    const options = openCategoryPicker();
    pickOption(options.find((o) => o.textContent === 'Health & Beauty')!);
    // The trigger now shows the picked category.
    expect(
      Array.from(document.querySelectorAll('button')).some((b) =>
        b.textContent?.trim().includes('Health & Beauty'),
      ),
    ).toBe(true);

    const reopened = openCategoryPicker();
    pickOption(reopened.find((o) => o.textContent === 'No category')!);
    // The trigger is back to the sentinel — no category chosen.
    expect(categoryTrigger()).toBeDefined();
    expect(
      Array.from(document.querySelectorAll('button')).some((b) =>
        b.textContent?.trim().includes('Health & Beauty'),
      ),
    ).toBe(false);
  });

  it('submits category_id: null when no category is chosen', async () => {
    renderAndOpen(makeProduct());
    const options = openCategoryPicker();
    pickOption(options.find((o) => o.textContent === 'No category')!);

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
    expect(actions.updateProductAction).toHaveBeenCalledWith(
      'product-1',
      expect.objectContaining({ category_id: null }),
    );
  });
});
