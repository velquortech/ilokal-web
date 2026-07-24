// @vitest-environment happy-dom

/**
 * Component test for the collapse-aware sidebar search.
 *
 * Driven with `react-dom/client` + happy-dom (both already present) instead of
 * @testing-library — its peer `@testing-library/dom` isn't installed and the
 * stack is frozen. The env is opted in per-file via the pragma above, so every
 * other test keeps the default `node` environment.
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  beforeEach,
  afterEach,
} from 'vitest';
import { SidebarProvider } from '@/components/ui/sidebar';
import { GlobalSearch } from '@/components/custom/GlobalSearch';

// useIsMobile() reads matchMedia + innerWidth; force a desktop viewport so the
// collapse-to-icon behaviour (desktop only) is exercised deterministically.
beforeAll(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: 1280,
  });
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

function renderSearch({
  open = true,
  value = '',
  onChange = vi.fn(),
  onOpenChange,
}: {
  open?: boolean;
  value?: string;
  onChange?: (v: string) => void;
  onOpenChange?: (open: boolean) => void;
} = {}) {
  act(() => {
    root.render(
      <SidebarProvider open={open} onOpenChange={onOpenChange}>
        <GlobalSearch value={value} onChange={onChange} />
      </SidebarProvider>,
    );
  });
}

/** Set an input's value through React's tracked native setter, then fire input. */
function typeInto(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set;
  setter?.call(input, value);
  act(() => {
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function click(el: Element) {
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

describe('GlobalSearch — expanded', () => {
  it('renders a labelled searchbox, not the icon button', () => {
    renderSearch({ open: true });
    const searchbox =
      container.querySelector<HTMLInputElement>('[role="searchbox"]');
    expect(searchbox).not.toBeNull();
    expect(searchbox?.getAttribute('aria-label')).toBe('Search menu');
    expect(container.querySelector('[aria-label="Open search"]')).toBeNull();
  });

  it('calls onChange as the user types', () => {
    const onChange = vi.fn();
    renderSearch({ open: true, onChange });
    const searchbox =
      container.querySelector<HTMLInputElement>('[role="searchbox"]')!;
    typeInto(searchbox, 'coup');
    expect(onChange).toHaveBeenCalledWith('coup');
  });

  it('shows a clear button only when there is a value, and clears on click', () => {
    const onChange = vi.fn();
    renderSearch({ open: true, value: '', onChange });
    expect(container.querySelector('[aria-label="Clear search"]')).toBeNull();

    renderSearch({ open: true, value: 'coup', onChange });
    const clearBtn = container.querySelector('[aria-label="Clear search"]');
    expect(clearBtn).not.toBeNull();
    click(clearBtn!);
    expect(onChange).toHaveBeenCalledWith('');
  });
});

describe('GlobalSearch — collapsed (desktop icon mode)', () => {
  it('renders the search icon button, not the input', () => {
    renderSearch({ open: false });
    expect(
      container.querySelector('[aria-label="Open search"]'),
    ).not.toBeNull();
    expect(container.querySelector('[role="searchbox"]')).toBeNull();
  });

  it('expands the sidebar when the icon button is clicked', () => {
    const onOpenChange = vi.fn();
    renderSearch({ open: false, onOpenChange });
    click(container.querySelector('[aria-label="Open search"]')!);
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });
});
