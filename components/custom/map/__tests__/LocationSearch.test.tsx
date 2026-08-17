// @vitest-environment happy-dom

/**
 * The map's place-search box.
 *
 * Leaflet is not involved here — `LocationSearch` is a plain input + dropdown
 * over the geocoder, so happy-dom is enough. What is pinned: debounce and the
 * minimum query length gate the network call, results render as listbox
 * options, and picking one delivers parsed coordinates through `onSelect`.
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/utils/geocode', () => ({
  geocodePlace: vi.fn(),
}));

import { geocodePlace } from '@/lib/utils/geocode';
import { LocationSearch } from '../LocationSearch';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(geocodePlace).mockResolvedValue([]);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

function render(onSelect = vi.fn()) {
  act(() => {
    root.render(<LocationSearch onSelect={onSelect} />);
  });
  return onSelect;
}

const input = () =>
  container.querySelector<HTMLInputElement>('input[type="search"]')!;

function typeInto(field: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set;
  setter?.call(field, value);
  act(() => {
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function advanceDebounce() {
  // Awaiting `act` flushes the microtasks the geocode promise resolves on.
  await act(async () => {
    vi.advanceTimersByTime(400);
  });
}

describe('the search gates the network call', () => {
  it('does not query for an empty or one-character query', async () => {
    const onSelect = render();

    typeInto(input(), 'a');

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(geocodePlace).not.toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('queries after the debounce window once the query is long enough', async () => {
    vi.mocked(geocodePlace).mockResolvedValue([
      {
        name: 'Iloilo City Proper, Iloilo, Philippines',
        latitude: 10.6969,
        longitude: 122.5732,
      },
    ]);
    render();

    typeInto(input(), 'Iloilo');
    await advanceDebounce();

    expect(geocodePlace).toHaveBeenCalledWith('Iloilo', expect.anything());
    // The result is rendered as a listbox option.
    expect(
      [...container.querySelectorAll('[role="option"]')].some((o) =>
        (o.textContent ?? '').includes('Iloilo City Proper'),
      ),
    ).toBe(true);
  });
});

describe('picking a result pins the place', () => {
  it('delivers parsed coordinates and shows the chosen name', async () => {
    vi.mocked(geocodePlace).mockResolvedValue([
      {
        name: 'Iloilo City Proper, Iloilo, Philippines',
        latitude: 10.6969,
        longitude: 122.5732,
      },
    ]);
    const onSelect = render();

    typeInto(input(), 'Iloilo City Proper');
    await advanceDebounce();

    act(() => {
      (
        [...container.querySelectorAll('[role="option"]')][0] as HTMLElement
      ).click();
    });

    expect(onSelect).toHaveBeenCalledWith(10.6969, 122.5732);
    expect(input().value).toBe('Iloilo City Proper, Iloilo, Philippines');
  });

  it('selects the highlighted option on Enter', async () => {
    vi.mocked(geocodePlace).mockResolvedValue([
      {
        name: 'SM City Iloilo, Iloilo City, Philippines',
        latitude: 10.7296,
        longitude: 122.5548,
      },
    ]);
    const onSelect = render();

    typeInto(input(), 'SM City');
    await advanceDebounce();

    act(() => {
      input().dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );
    });

    expect(onSelect).toHaveBeenCalledWith(10.7296, 122.5548);
  });
});
