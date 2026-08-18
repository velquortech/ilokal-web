// @vitest-environment happy-dom

/**
 * The category step's search dropdown.
 *
 * The search bar exists because owners could not find their category by
 * browsing the grid one business type at a time. It must (1) match across
 * EVERY vertical, not just the filtered one, (2) be navigable by keyboard —
 * arrows move the highlight, Enter picks it — and (3) when a result is
 * picked, auto-fill the type filter with the vertical that owns the category
 * so the filter never disagrees with the selection.
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Coffee, Store } from 'lucide-react';
import type { BusinessProps } from '../validator/business-registration-form-schema';
import type { BusinessType } from '../api/fetchCategories';

const formRef: { current: UseFormReturn<BusinessProps> | null } = {
  current: null,
};

const { logOwnerEvent } = vi.hoisted(() => ({ logOwnerEvent: vi.fn() }));

vi.mock('../actions/ownerEvents', () => ({ logOwnerEvent }));

const DEFAULT_TYPES: BusinessType[] = [
  {
    name: 'Food & Drink',
    description: 'Restaurants and cafes',
    icon: Coffee,
    offeringProfile: null,
    items: [
      {
        id: 'cat-cafe',
        name: 'Cafe',
        description: 'Coffee shops',
        imageURL: 'https://example.com/cafe.jpg',
      },
      {
        id: 'cat-bakery',
        name: 'Bakery',
        description: 'Bread and pastries',
        imageURL: 'https://example.com/bakery.jpg',
      },
    ],
  },
  {
    name: 'Health & Beauty',
    description: 'Salons and clinics',
    icon: Store,
    offeringProfile: null,
    items: [
      {
        id: 'cat-salon',
        name: 'Salon',
        description: 'Hair and nails',
        imageURL: 'https://example.com/salon.jpg',
      },
    ],
  },
];

// A `let` so a test can swap in a fixture with colliding category names — the
// real taxonomy has a "General" category in every vertical.
let businessTypes: BusinessType[] = DEFAULT_TYPES;

vi.mock('../provider/registration-form-provider', () => ({
  useMultiStepForm: () => ({
    form: formRef.current,
    businessTypes,
  }),
}));

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt} {...props} />
  ),
}));

const { ShopCategoryStep } = await import('../steps/ShopCategoryStep');

function Harness() {
  const form = useForm<BusinessProps>({
    mode: 'onChange',
    defaultValues: {
      business_category: { type: 'predefined', name: '', description: '' },
    } as Partial<BusinessProps> as BusinessProps,
  });
  formRef.current = form;
  return <ShopCategoryStep />;
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  formRef.current = null;
  businessTypes = DEFAULT_TYPES;
  logOwnerEvent.mockClear();
  // The recents history is localStorage-backed and shared across tests in
  // this file — reset it so one test's picks never leak into another's grid.
  localStorage.clear();
});

function searchInput(): HTMLInputElement {
  return container.querySelector<HTMLInputElement>(
    'input[aria-label="Search categories"]',
  )!;
}

function search(value: string) {
  const input = searchInput();
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )!.set!;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function pressKey(key: string) {
  act(() => {
    searchInput().dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true }),
    );
  });
}

function dropdownOpen(): boolean {
  return container.querySelector('[role="listbox"]') !== null;
}

function optionNames(): string[] {
  return Array.from(container.querySelectorAll('[role="option"]')).map((o) =>
    o.textContent!.trim(),
  );
}

function clickOption(name: string) {
  const option = Array.from(container.querySelectorAll('[role="option"]')).find(
    (o) => o.textContent?.includes(name),
  )!;
  act(() => {
    option.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

function clickClear() {
  const clear = container.querySelector<HTMLButtonElement>(
    'button[aria-label="Clear search"]',
  )!;
  act(() => {
    clear.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

function gridCardNames(): string[] {
  return Array.from(container.querySelectorAll('img')).map(
    (img) => img.getAttribute('alt') ?? '',
  );
}

function clickGridCard(name: string) {
  const img = Array.from(container.querySelectorAll('img')).find(
    (el) => el.getAttribute('alt') === name,
  )!;
  act(() => {
    img
      .closest('div')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

/** Click a Recently chosen strip chip — its button text is the bare name. */
function clickRecent(name: string) {
  const chip = Array.from(container.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === name,
  )!;
  act(() => {
    chip.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

describe('the search dropdown', () => {
  it('opens on typing and lists matches across every business type', () => {
    act(() => root.render(<Harness />));
    search('salon');

    // Salon belongs to Health & Beauty, which is not the default filter — the
    // search still surfaces it.
    expect(dropdownOpen()).toBe(true);
    expect(optionNames().join(' | ')).toContain('Salon');
    expect(container.textContent).toContain('1 match');
    // The grid itself is untouched by a search.
    expect(gridCardNames()).toEqual(['Cafe', 'Bakery', 'Salon']);
  });

  it('matches on a partial, case-insensitive name', () => {
    act(() => root.render(<Harness />));
    search('CAF');
    expect(optionNames()).toHaveLength(1);
    expect(optionNames()[0]).toContain('Cafe');
  });

  it('shows an empty state when nothing matches', () => {
    act(() => root.render(<Harness />));
    search('not a real category');
    expect(optionNames()).toEqual([]);
    expect(container.textContent).toContain('No categories match');
  });

  it('closes on blur and reopens on refocus with the query intact', () => {
    act(() => root.render(<Harness />));
    search('salon');
    // React's onBlur/onFocus listen to the bubbling focusout/focusin events.
    act(() => {
      searchInput().dispatchEvent(
        new FocusEvent('focusout', { bubbles: true }),
      );
    });
    expect(dropdownOpen()).toBe(false);

    act(() => {
      searchInput().dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    });
    expect(dropdownOpen()).toBe(true);
  });

  it('clears the query and closes with the clear button', () => {
    act(() => root.render(<Harness />));
    search('salon');
    clickClear();
    expect(searchInput().value).toBe('');
    expect(dropdownOpen()).toBe(false);
    expect(gridCardNames()).toEqual(['Cafe', 'Bakery', 'Salon']);
  });
});

describe('picking from the dropdown', () => {
  it('Enter picks the highlighted result and auto-fills category + type', () => {
    act(() => root.render(<Harness />));
    search('salon');
    pressKey('Enter');

    expect(formRef.current!.getValues('business_category')).toMatchObject({
      id: 'cat-salon',
      type: 'predefined',
      name: 'Salon',
      description: 'Hair and nails',
    });
    // The filter (and its chip) agree with the selection.
    expect(container.textContent).toContain('Health & Beauty');
    // Search mode is over: query cleared, dropdown closed, and the pick
    // landed in the Recently chosen strip. The grid still shows the picked
    // card with its selected ring so a re-click can toggle it off.
    expect(searchInput().value).toBe('');
    expect(dropdownOpen()).toBe(false);
    expect(container.textContent).toContain('Recently chosen');
    expect(gridCardNames()).toEqual(['Salon']);
  });

  it('ArrowDown moves the highlight and Enter picks the new row', () => {
    act(() => root.render(<Harness />));
    // 'e' matches Cafe and Bakery.
    search('e');
    expect(optionNames()).toHaveLength(2);
    pressKey('ArrowDown');
    pressKey('Enter');

    expect(formRef.current!.getValues('business_category')).toMatchObject({
      id: 'cat-bakery',
      name: 'Bakery',
    });
  });

  it('ArrowUp wraps to the last result', () => {
    act(() => root.render(<Harness />));
    search('e');
    pressKey('ArrowUp');
    pressKey('Enter');

    expect(formRef.current!.getValues('business_category')).toMatchObject({
      id: 'cat-bakery',
      name: 'Bakery',
    });
  });

  it('Escape clears the search', () => {
    act(() => root.render(<Harness />));
    search('salon');
    pressKey('Escape');
    expect(searchInput().value).toBe('');
    expect(dropdownOpen()).toBe(false);
  });

  it('clicking a result picks it', () => {
    act(() => root.render(<Harness />));
    search('salon');
    clickOption('Salon');

    expect(formRef.current!.getValues('business_category')).toMatchObject({
      id: 'cat-salon',
      name: 'Salon',
    });
    expect(container.textContent).toContain('Health & Beauty');
  });

  it('marks a category that is already picked', () => {
    act(() => root.render(<Harness />));
    clickGridCard('Cafe');
    search('cafe');
    // The picked row shows a check inside the dropdown.
    expect(
      container.querySelectorAll('[role="option"] .text-primary'),
    ).not.toHaveLength(0);
  });
});

describe('recently chosen categories', () => {
  const seedRecents = (items: { id: string; name: string }[]) => {
    localStorage.setItem('ilokal-recent-categories', JSON.stringify(items));
  };

  it('shows a Recently chosen strip above the grid, and picked cards stay in the grid too', () => {
    seedRecents([{ id: 'cat-cafe', name: 'Cafe' }]);
    act(() => root.render(<Harness />));

    expect(container.textContent).toContain('Recently chosen');
    // The strip chip is a button labelled with the bare category name.
    expect(
      Array.from(container.querySelectorAll('button')).some(
        (b) => b.textContent?.trim() === 'Cafe',
      ),
    ).toBe(true);
    // Cafe also appears in the grid with its selected ring so a re-click
    // can toggle it off.
    expect(gridCardNames()).toEqual(['Cafe', 'Bakery', 'Salon']);
  });

  it('picking a grid category records it for the next visit', () => {
    act(() => root.render(<Harness />));
    clickGridCard('Cafe');

    expect(
      JSON.parse(localStorage.getItem('ilokal-recent-categories')!),
    ).toEqual([{ id: 'cat-cafe', name: 'Cafe' }]);
  });

  it('picking from the search dropdown records it too', () => {
    act(() => root.render(<Harness />));
    search('salon');
    pressKey('Enter');

    expect(
      JSON.parse(localStorage.getItem('ilokal-recent-categories')!),
    ).toEqual([{ id: 'cat-salon', name: 'Salon' }]);
  });

  it('moves a re-picked category to the front and caps the strip at five', () => {
    seedRecents([
      { id: 'cat-bakery', name: 'Bakery' },
      { id: 'cat-cafe', name: 'Cafe' },
      { id: 'cat-salon', name: 'Salon' },
      { id: 'gone-1', name: 'Gone 1' },
      { id: 'gone-2', name: 'Gone 2' },
    ]);
    act(() => root.render(<Harness />));

    clickRecent('Cafe');

    const stored = JSON.parse(
      localStorage.getItem('ilokal-recent-categories')!,
    );
    expect(stored).toHaveLength(5);
    expect(stored[0]).toEqual({ id: 'cat-cafe', name: 'Cafe' });
    // Categories that no longer exist never render in the strip. The three
    // real ones live in both the strip and the grid (with selected rings).
    expect(container.textContent).not.toContain('Gone');
    expect(container.textContent).toContain('Recently chosen');
    // Cafe and Bakery are Food & Drink (filter auto-jumped from the click).
    // Salon (Health & Beauty) is excluded by the filter.
    expect(gridCardNames()).toEqual(['Cafe', 'Bakery']);
  });

  it('picking a recent chip fills the category and the type filter', () => {
    seedRecents([{ id: 'cat-salon', name: 'Salon' }]);
    act(() => root.render(<Harness />));

    clickRecent('Salon');

    expect(formRef.current!.getValues('business_category')).toMatchObject({
      id: 'cat-salon',
      name: 'Salon',
    });
    // The type filter (and its chip) jumps to the pick's vertical.
    expect(container.textContent).toContain('Health & Beauty');
    // The chip is marked as the current selection.
    const chip = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Salon',
    )!;
    expect(chip.classList.contains('border-primary')).toBe(true);
  });

  it('ignores recents that no longer exist in the taxonomy', () => {
    seedRecents([{ id: 'gone-1', name: 'Gone' }]);
    act(() => root.render(<Harness />));

    expect(container.textContent).not.toContain('Recently chosen');
    expect(gridCardNames()).toEqual(['Cafe', 'Bakery', 'Salon']);
  });

  it('logs a reg_recent_picked funnel event when a strip chip is picked', () => {
    seedRecents([{ id: 'cat-salon', name: 'Salon' }]);
    act(() => root.render(<Harness />));

    clickRecent('Salon');

    expect(logOwnerEvent).toHaveBeenCalledWith('reg_recent_picked', {
      category_id: 'cat-salon',
      category_name: 'Salon',
    });
  });

  it('does not log reg_recent_picked when re-clicking the selected chip', () => {
    seedRecents([{ id: 'cat-salon', name: 'Salon' }]);
    act(() => root.render(<Harness />));

    clickRecent('Salon');
    clickRecent('Salon');

    // First click picked (one event); the second un-picked (none).
    expect(logOwnerEvent).toHaveBeenCalledTimes(1);
  });

  it('logs a reg_category_searched funnel event once a search settles', async () => {
    act(() => root.render(<Harness />));
    search('salon');

    // Debounced: the event fires 600ms after typing stops, once per phrase.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 700));
    });

    expect(logOwnerEvent).toHaveBeenCalledWith('reg_category_searched', {
      query: 'salon',
      results: 1,
    });
    expect(logOwnerEvent).toHaveBeenCalledTimes(1);
  });

  it('uses id-based comparison so same-named cards do not share selection state', () => {
    businessTypes = [
      {
        name: 'Food & Drink',
        description: 'Restaurants',
        icon: Coffee,
        offeringProfile: null,
        items: [
          {
            id: 'cat-general-fnb',
            name: 'General',
            description: 'F&B general',
            imageURL: 'https://example.com/general.jpg',
          },
        ],
      },
      {
        name: 'Health & Beauty',
        description: 'Salons',
        icon: Store,
        offeringProfile: null,
        items: [
          {
            id: 'cat-general-hb',
            name: 'General',
            description: 'H&B general',
            imageURL: 'https://example.com/general2.jpg',
          },
        ],
      },
    ];
    act(() => root.render(<Harness />));

    // Both General cards render in the All view.
    expect(gridCardNames()).toEqual(['General', 'General']);

    // Pick the first General card (F&B) — the form must carry its id,
    // not the H&B one.
    clickGridCard('General');
    expect(formRef.current!.getValues('business_category')).toMatchObject({
      id: 'cat-general-fnb',
      type: 'predefined',
      name: 'General',
      description: 'F&B general',
    });
    // The type filter auto-jumped to Food & Drink.
    expect(container.textContent).toContain('Food & Drink');

    // Both General cards are still in the grid (picked cards stay visible).
    // Only the F&B one has the selected ring; the H&B one does not.
    const gridCards = container.querySelectorAll('.grid > div');
    expect(gridCards).toHaveLength(1);
    expect(gridCards[0].querySelector('.ring-primary')).not.toBeNull();

    // Re-clicking the same grid card toggles it off.
    clickGridCard('General');
    expect(formRef.current!.getValues('business_category')).toMatchObject({
      id: undefined,
      name: '',
    });
    // The check ring is gone.
    expect(container.querySelector('.ring-primary')).toBeNull();
  });

  it('a strip chip switches to its own category when another vertical shares the name', () => {
    // The real taxonomy has a "General" category in every vertical — same
    // name, different ids. Selection must be compared by id, or a same-named
    // chip reads as selected and a click un-picks instead of switching.
    businessTypes = [
      {
        name: 'Food & Drink',
        description: 'Restaurants',
        icon: Coffee,
        offeringProfile: null,
        items: [
          {
            id: 'cat-general-fnb',
            name: 'General',
            description: 'F&B general',
            imageURL: 'https://example.com/general.jpg',
          },
        ],
      },
      {
        name: 'Health & Beauty',
        description: 'Salons',
        icon: Store,
        offeringProfile: null,
        items: [
          {
            id: 'cat-general-hb',
            name: 'General',
            description: 'H&B general',
            imageURL: 'https://example.com/general2.jpg',
          },
        ],
      },
    ];
    seedRecents([{ id: 'cat-general-fnb', name: 'General' }]);
    act(() => root.render(<Harness />));

    // Pick the OTHER vertical's General via the search dropdown.
    search('general');
    clickOption('Health & Beauty');
    expect(formRef.current!.getValues('business_category')).toMatchObject({
      id: 'cat-general-hb',
      name: 'General',
    });

    const chips = Array.from(container.querySelectorAll('button')).filter(
      (b) => b.textContent?.trim() === 'General',
    );
    // Both Generals are in the strip now, but only the picked one (Health &
    // Beauty, most recent) is marked selected.
    expect(
      chips.filter((c) => c.classList.contains('border-primary')),
    ).toHaveLength(1);

    // Clicking the Food & Drink chip — same name, different id — must SWITCH
    // the form to it, not toggle the selection off.
    act(() => {
      chips[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(formRef.current!.getValues('business_category')).toMatchObject({
      id: 'cat-general-fnb',
      name: 'General',
    });
  });
});

describe('the grid keeps its own behavior', () => {
  it('toggles a card on and off via the recents strip', () => {
    act(() => root.render(<Harness />));
    clickGridCard('Cafe');

    expect(formRef.current!.getValues('business_category')).toMatchObject({
      id: 'cat-cafe',
      name: 'Cafe',
    });

    // The picked card also appears in the Recently chosen strip; clicking
    // the selected chip un-picks, same contract as clicking the grid card.
    clickRecent('Cafe');
    expect(formRef.current!.getValues('business_category')).toMatchObject({
      id: undefined,
      name: '',
    });
  });

  it('toggles a card off by re-clicking it in the grid', () => {
    act(() => root.render(<Harness />));
    clickGridCard('Cafe');

    expect(formRef.current!.getValues('business_category')).toMatchObject({
      id: 'cat-cafe',
      name: 'Cafe',
    });

    // Re-clicking the same grid card toggles it off — the card stayed
    // in the grid with its selected ring after the first pick.
    clickGridCard('Cafe');
    expect(formRef.current!.getValues('business_category')).toMatchObject({
      id: undefined,
      name: '',
    });
  });
});

describe('a category with no image', () => {
  // `business_categories.image_url` is NULLABLE and the admin create path runs
  // no Zod validation, so a category with no picture is reachable today.
  // Passing null (or '') to next/image THROWS and takes the whole registration
  // step down — the grid is the step's entire content.
  //
  // NOTE ON WHAT THIS CAN PROVE: next/image is mocked as a plain <img> at the
  // top of this file, so a mocked render would happily accept a null src and
  // no test here can reproduce the real throw. What it CAN pin — and what
  // actually prevents the crash — is that the component never hands next/image
  // a falsy src in the first place.
  beforeEach(() => {
    businessTypes = [
      {
        name: 'Food & Drink',
        description: 'Restaurants and cafes',
        icon: Coffee,
        offeringProfile: null,
        items: [
          {
            id: 'cat-noimage',
            name: 'Carinderia',
            description: 'Home-style eateries',
            imageURL: null,
          },
          {
            id: 'cat-cafe',
            name: 'Cafe',
            description: 'Coffee shops',
            imageURL: 'https://example.com/cafe.jpg',
          },
        ],
      },
    ];
  });

  it('renders the card without passing a falsy src to next/image', () => {
    act(() => root.render(<Harness />));

    // The category is still offered — a missing photo must not hide a whole
    // trade from the taxonomy.
    expect(container.textContent).toContain('Carinderia');

    // The real invariant: every rendered image has a non-empty src.
    const srcs = Array.from(container.querySelectorAll('img')).map((img) =>
      img.getAttribute('src'),
    );
    expect(srcs.length).toBeGreaterThan(0);
    for (const src of srcs) {
      expect(src).toBeTruthy();
    }
    // Only the category that HAS an image contributes one.
    expect(srcs).toEqual(['https://example.com/cafe.jpg']);
  });

  // NOTE: the shared `clickGridCard`/`gridCardNames` helpers locate cards by
  // their <img> ALT text, so they cannot see an imageless card at all — the
  // same assumption that produced the bug. Clicking by title text instead;
  // the handler sits on the card root and the event bubbles up to it.
  function clickCardByTitle(name: string) {
    const title = Array.from(container.querySelectorAll('p')).find(
      (el) => el.textContent?.trim() === name,
    )!;
    act(() => {
      title.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  }

  it('still lets the imageless category be picked', () => {
    act(() => root.render(<Harness />));
    clickCardByTitle('Carinderia');

    expect(formRef.current!.getValues('business_category')).toMatchObject({
      id: 'cat-noimage',
      name: 'Carinderia',
    });
  });
});
