// @vitest-environment happy-dom

/**
 * AddProductDialog — localStorage draft persistence. The dialog autosaves the
 * form's serializable values while typing and restores them on the next open,
 * so a fat-fingered close never loses work. These tests pin the contract that
 * actually broke in the wild: a draft RESTORED from storage must be DISCARDED
 * when the item is saved.
 *
 * The failure mode this guards: the restore path calls RHF's
 * `reset(values)`, which (without keepDefaultValues) rewrites the form's
 * `_defaultValues` to the draft. The submit path's `reset()` then falls back
 * to those poisoned defaults — the form shows the saved item as if it were
 * still in progress — and the debounced autosave writes the draft back, so a
 * successful save never cleared it. The fix: restore with
 * `keepDefaultValues: true` and reset to an explicit empty form on save.
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
  useBusinessShop: () => ({
    selectedBranchId: null,
    // A business id is required for the per-business draft key.
    business: { id: 'biz-1' },
  }),
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
    kind: null,
  },
];

const DRAFT_KEY = 'ilokal-product-draft:biz-1';

/** A valid draft envelope of the form's serializable values (no image). */
function seedDraft(name: string, price: number) {
  window.localStorage.setItem(
    DRAFT_KEY,
    JSON.stringify({
      v: 1,
      timestamp: Date.now(),
      values: {
        name,
        description: '',
        price,
        price_type: 'fixed',
        price_unit: '',
        category_id: undefined,
        section_id: '',
        kind: 'product',
        is_available: true,
        duration_minutes: null,
        lead_time_minutes: null,
        inventory_count: null,
        capacity: null,
        deposit_amount: null,
        min_duration_units: null,
        max_duration_units: null,
        service_location: 'at_business',
      },
    }),
  );
}

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  window.localStorage.clear();
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
  window.localStorage.clear();
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

function nameInput(): HTMLInputElement {
  return Array.from(document.querySelectorAll('input')).find(
    (i) => i.getAttribute('placeholder') === 'e.g. Flat White',
  ) as HTMLInputElement;
}

/** Resolve the async submit (RHF validates then calls onSubmit). */
async function flushSubmit() {
  const form = document.querySelector('form')!;
  await act(async () => {
    form.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('AddProductDialog draft persistence', () => {
  it('restores a stored draft when the dialog opens', () => {
    seedDraft('Draft Item', 5);
    renderOpen();
    expect(nameInput().value).toBe('Draft Item');
  });

  it('discards the draft after a successful save (restore path)', async () => {
    seedDraft('Draft Item', 5);
    renderOpen();
    // The restore seeded the form; the autosave rewrites the key while open.
    expect(nameInput().value).toBe('Draft Item');

    await flushSubmit();
    expect(actions.createProductAction).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Draft Item', price: 5 }),
    );

    // Wait out the debounced autosave: a stale timer that re-read the form's
    // (poisoned) defaults would rewrite the key here — the exact bug this
    // guards against.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 700));
    });
    expect(window.localStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it('keeps the draft when the dialog is closed without saving', async () => {
    seedDraft('Draft Item', 5);
    // Controlled open so the test can close (and later reopen) the dialog.
    function Harness() {
      const [open, setOpen] = React.useState(true);
      return (
        <AddProductDialog
          open={open}
          onOpenChange={setOpen}
          categories={CATEGORIES}
        >
          <button type="button">Add product</button>
        </AddProductDialog>
      );
    }
    act(() => {
      root.render(<Harness />);
    });
    expect(nameInput().value).toBe('Draft Item');

    // Close via the Cancel button → the draft must survive.
    act(() => {
      Array.from(document.querySelectorAll('button'))
        .find((b) => b.textContent?.trim() === 'Cancel')!
        .click();
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 700));
    });
    expect(window.localStorage.getItem(DRAFT_KEY)).not.toBeNull();
    // The dialog is gone.
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});
