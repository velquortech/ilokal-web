// @vitest-environment happy-dom

/**
 * The chip strip's contract, and the reason this file exists: **every product
 * must be reachable from some chip.** Before phase 3 the strip listed only
 * platform categories, so the 85 products with no category matched nothing,
 * and the only way to clear a filter was to re-click the active chip.
 *
 * react-dom/client + happy-dom per repo convention (the stack is frozen and
 * @testing-library/dom is not installed).
 */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Catalogues, UNCATEGORISED } from '../catalogues';
import type { ProductSectionWithCount } from '@/lib/types';

const section = (
  id: string,
  name: string,
  product_count: number,
): ProductSectionWithCount => ({
  id,
  business_id: 'biz',
  name,
  position: 0,
  product_count,
  created_at: '',
  updated_at: '',
  archived_at: null,
});

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

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
});

function render(props: Parameters<typeof Catalogues>[0]) {
  act(() => {
    root.render(<Catalogues {...props} />);
  });
}

const noop = () => {};

describe('Catalogues chip strip', () => {
  it('always offers an explicit All chip', () => {
    render({
      sections: [],
      uncategorisedCount: 0,
      selectedSection: '',
      onSectionChange: noop,
    });

    const labels = [...container.querySelectorAll('button')].map((b) =>
      b.textContent?.trim(),
    );
    expect(labels).toContain('All');
  });

  it('lists each section with its count', () => {
    render({
      sections: [section('a', 'Hot Drinks', 4), section('b', 'Pastries', 0)],
      uncategorisedCount: 0,
      selectedSection: '',
      onSectionChange: noop,
    });

    const text = container.textContent ?? '';
    expect(text).toContain('Hot Drinks');
    expect(text).toContain('4');
    // A section with nothing in it still shows — it is where the owner will
    // put things next, and hiding it would look like the section vanished.
    expect(text).toContain('Pastries');
  });

  it('shows Uncategorised whenever anything is in it', () => {
    render({
      sections: [section('a', 'Hot Drinks', 1)],
      uncategorisedCount: 85,
      selectedSection: '',
      onSectionChange: noop,
    });

    const uncategorised = [...container.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Uncategorised'),
    );
    // Radix does not forward `value` to the DOM, so the selected-state test
    // below is what pins UNCATEGORISED to this chip.
    expect(uncategorised).toBeTruthy();
    expect(uncategorised?.textContent).toContain('85');
  });

  it('hides Uncategorised once everything is grouped', () => {
    render({
      sections: [section('a', 'Hot Drinks', 3)],
      uncategorisedCount: 0,
      selectedSection: '',
      onSectionChange: noop,
    });

    expect(container.textContent).not.toContain('Uncategorised');
  });

  it('shows All as SELECTED when no filter is applied', () => {
    // Regression: with `value=""` on the item, Radix computes its pressed set
    // as `value ? [value] : []`, so the default view had no active chip at all
    // — the exact discoverability problem this strip exists to fix.
    render({
      sections: [section('a', 'Hot Drinks', 1)],
      uncategorisedCount: 0,
      selectedSection: '',
      onSectionChange: noop,
    });

    const pressed = [...container.querySelectorAll('button')].filter(
      (b) => b.getAttribute('data-state') === 'on',
    );
    expect(pressed).toHaveLength(1);
    expect(pressed[0].textContent).toContain('All');
  });

  it('hides counts when the counts read failed, rather than showing zeroes', () => {
    render({
      sections: [section('a', 'Hot Drinks', 0)],
      uncategorisedCount: 0,
      countsFailed: true,
      selectedSection: '',
      onSectionChange: noop,
    });

    const chip = [...container.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Hot Drinks'),
    );
    expect(chip?.textContent?.trim()).toBe('Hot Drinks');
    // Uncategorised stays reachable: with counts unknown we cannot claim it is
    // empty, and hiding it would strand any ungrouped offering.
    expect(container.textContent).toContain('Uncategorised');
  });

  it('marks the active chip, including Uncategorised', () => {
    render({
      sections: [section('a', 'Hot Drinks', 1)],
      uncategorisedCount: 2,
      selectedSection: UNCATEGORISED,
      onSectionChange: noop,
    });

    const pressed = [...container.querySelectorAll('button')].filter(
      (b) => b.getAttribute('data-state') === 'on',
    );
    expect(pressed).toHaveLength(1);
    expect(pressed[0].textContent).toContain('Uncategorised');
  });

  it('labels the group for assistive tech', () => {
    render({
      sections: [],
      uncategorisedCount: 0,
      selectedSection: '',
      onSectionChange: noop,
    });

    expect(
      container.querySelector('[aria-label="Filter by section"]'),
    ).toBeTruthy();
  });
});
