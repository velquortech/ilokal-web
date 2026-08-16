// @vitest-environment happy-dom

/**
 * The admin category table + dialog — the parts that are logic rather than
 * layout: rows render with their scope, a new category submits a derived slug
 * and NULL scope by default, and editing a category never re-derives its
 * stored slug (URLs and the mobile filter depend on slug stability).
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Category } from '@/lib/types';

const { create, update, remove, toast, refresh } = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
  refresh: vi.fn(),
}));

vi.mock('../../actions/categoryActions', () => ({
  createCategoryAction: create,
  updateCategoryAction: update,
  deleteCategoryAction: remove,
}));
vi.mock('sonner', () => ({ toast }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

import { AdminCategoriesContent } from '../components/admin-categories-content';

const CATS: Category[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Bakery & Pastries',
    slug: 'bakery-pastries',
    description: null,
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
    business_type_id: 'type-fnb',
    kind: 'product',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Rooms & Stays',
    slug: 'rooms-stays',
    description: 'Staycations and overnight stays.',
    created_at: '2026-08-02T00:00:00Z',
    updated_at: '2026-08-02T00:00:00Z',
    business_type_id: null,
    kind: null,
  },
];

const TYPES = [
  { id: 'type-fnb', name: 'Food & Beverage' },
  { id: 'type-tourism', name: 'Tourism & Leisure' },
];

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.clearAllMocks();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render() {
  act(() => {
    root.render(
      <AdminCategoriesContent
        categories={CATS}
        businessTypes={TYPES}
        loadFailed={false}
      />,
    );
  });
}

/** Everything is queried on document.body — the Radix dialog portals out. */
const q = (sel: string) => document.body.querySelector(sel);
const qa = (sel: string) => [...document.body.querySelectorAll(sel)];

function buttonWith(text: RegExp) {
  return qa('button').find((b) => text.test(b.textContent ?? ''));
}

function click(el: Element) {
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

function typeInto(input: HTMLInputElement, value: string) {
  const setValue = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )!.set!;
  act(() => {
    setValue.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('AdminCategoriesContent', () => {
  it('renders the rows with their kind and vertical scope', () => {
    render();

    expect(container.textContent).toContain('Bakery & Pastries');
    expect(container.textContent).toContain('Rooms & Stays');
    // Kind badges: pinned product vs either.
    expect(container.textContent).toContain('Product');
    expect(container.textContent).toContain('Either');
    // Vertical cell: pinned type name vs Global.
    expect(container.textContent).toContain('Food & Beverage');
    expect(container.textContent).toContain('Global');
  });

  it('opens the Add dialog with all four fields and a Global default', () => {
    render();
    click(buttonWith(/Add Category/)!);

    const dialog = q('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog?.textContent).toContain('Add Category');
    for (const label of ['Name', 'Slug', 'Kind', 'Business Type']) {
      expect(dialog?.textContent).toContain(label);
    }
    // Defaults: kind Either, vertical Global.
    expect(dialog?.textContent).toContain('Either');
    expect(dialog?.textContent).toContain('Global');
  });

  it('submits a new category with a derived slug and NULL scope by default', async () => {
    create.mockResolvedValue({ success: true, data: CATS[0] });
    render();

    click(buttonWith(/Add Category/)!);
    const nameInput = q('#cat-name') as HTMLInputElement;
    typeInto(nameInput, 'Burger Barn');

    click(buttonWith(/Create Category/)!);
    await flush();

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Burger Barn',
        slug: 'burger-barn',
        kind: null,
        business_type_id: null,
      }),
    );
    expect(toast.success).toHaveBeenCalledWith('Category created.');
    expect(refresh).toHaveBeenCalled();
    expect(q('[role="dialog"]')).toBeNull();
  });

  it('prefills the edit dialog and never re-derives the stored slug', async () => {
    update.mockResolvedValue({ success: true, data: CATS[1] });
    render();

    click(
      qa('button').find(
        (b) => b.getAttribute('aria-label') === 'Edit Rooms & Stays',
      )!,
    );

    const nameInput = q('#cat-name') as HTMLInputElement;
    const slugInput = q('#cat-slug') as HTMLInputElement;
    expect(nameInput.value).toBe('Rooms & Stays');
    expect(slugInput.value).toBe('rooms-stays');

    // Renaming must NOT rewrite the slug: it is stored and referenced.
    typeInto(nameInput, 'Rooms & Stays & Villas');
    expect(slugInput.value).toBe('rooms-stays');

    click(buttonWith(/Save Changes/)!);
    await flush();

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(
      CATS[1].id,
      expect.objectContaining({
        name: 'Rooms & Stays & Villas',
        slug: 'rooms-stays',
      }),
    );
    expect(toast.success).toHaveBeenCalledWith('Category updated.');
  });
});
