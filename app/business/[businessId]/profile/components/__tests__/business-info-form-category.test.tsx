// @vitest-environment happy-dom

/**
 * BusinessInfoForm — the Category picker's clear contract. The category is
 * optional (`category_id` is nullable, the schema allows null, and clearing it
 * is a supported state the DB trigger handles), so it must offer the same
 * "No category" un-pick the product dialogs do. These tests pin that: the
 * sentinel renders first, picking a category shows it on the trigger, picking
 * "No category" clears it back, and the cleared value submits as null.
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
  actions: { updateBusinessProfileAction: vi.fn() },
}));

vi.mock('@/app/business/[businessId]/actions/profileActions', () => actions);
vi.mock('@/components/custom/GalleryUploader', () => ({
  GalleryUploader: () => <div data-testid="gallery" />,
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

import { BusinessInfoForm } from '../BusinessInfoForm';
import type { ProfileBusinessTypeOption } from '../BusinessInfoForm';

const SERVICES: ProfileBusinessTypeOption = {
  id: 'type-services',
  name: 'Services',
  icon: 'wrench',
  description: 'Shops that sell services',
  categories: [
    { id: 'cat-computer', name: 'Computer / Internet Shop' },
    { id: 'cat-salon', name: 'Salon / Barbershop' },
  ],
};

const TYPES = [SERVICES];

const BUSINESS = {
  shop_name: 'GigaGrind iCafe & Services',
  description: 'A cybercafé',
  logo_url: null,
  banner_url: null,
  category_id: 'cat-computer',
  interior_images: [],
};

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  actions.updateBusinessProfileAction.mockReset().mockResolvedValue({
    success: true,
    data: {},
  });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function renderForm() {
  act(() => {
    root.render(
      <BusinessInfoForm
        businessId="biz-1"
        business={BUSINESS as never}
        businessTypes={TYPES}
      />,
    );
  });
}

/** Opens the category Select and returns its option elements. */
function openCategoryPicker() {
  const trigger = Array.from(document.querySelectorAll('button')).find(
    (b) =>
      b.getAttribute('role') === 'combobox' &&
      [
        'No category',
        'Computer / Internet Shop',
        'Salon / Barbershop',
      ].includes(b.textContent?.trim() ?? ''),
  )!;
  act(() => {
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

describe('BusinessInfoForm category picker', () => {
  it('offers "No category" ahead of the real options', () => {
    renderForm();
    const options = openCategoryPicker();
    expect(options[0]?.textContent?.trim()).toBe('No category');
    expect(options.map((o) => o.textContent?.trim())).toEqual(
      expect.arrayContaining([
        'Computer / Internet Shop',
        'Salon / Barbershop',
      ]),
    );
  });

  it('clears a picked category back to "No category" when the sentinel is chosen', () => {
    renderForm();
    const options = openCategoryPicker();
    pickOption(options.find((o) => o.textContent === 'Salon / Barbershop')!);
    expect(
      Array.from(document.querySelectorAll('button')).some((b) =>
        b.textContent?.trim().includes('Salon / Barbershop'),
      ),
    ).toBe(true);

    const reopened = openCategoryPicker();
    pickOption(reopened.find((o) => o.textContent === 'No category')!);
    // Trigger is back to the sentinel — no category chosen.
    expect(
      Array.from(document.querySelectorAll('button')).some(
        (b) => b.textContent?.trim() === 'No category',
      ),
    ).toBe(true);
    expect(
      Array.from(document.querySelectorAll('button')).some((b) =>
        b.textContent?.trim().includes('Salon / Barbershop'),
      ),
    ).toBe(false);
  });

  it('submits category_id: null when "No category" is chosen', async () => {
    renderForm();
    const options = openCategoryPicker();
    pickOption(options.find((o) => o.textContent === 'No category')!);

    // The dialog has two selects (type, category); the save button is the
    // form's submit. Fire the form submit directly since the button click
    // does not propagate in happy-dom.
    const form = document.querySelector('form')!;
    await act(async () => {
      form.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      );
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(actions.updateBusinessProfileAction).toHaveBeenCalledWith(
      'biz-1',
      expect.objectContaining({ category_id: null }),
    );
  });
});
