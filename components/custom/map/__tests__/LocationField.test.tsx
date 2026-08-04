// @vitest-environment happy-dom

/**
 * The pin field.
 *
 * The map itself is stubbed — leaflet needs a real layout box and a tile
 * server, neither of which happy-dom has, and none of the claims here are
 * about leaflet. What is being pinned is the contract AROUND the map: the
 * inputs stay the keyboard path, a half-typed number does not get eaten, the
 * pair is all-or-nothing, and the wheel-zoom switch reaches the map.
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const pickerProps: Array<Record<string, unknown>> = [];

vi.mock('../LocationPicker', () => ({
  LocationPicker: (props: Record<string, unknown>) => {
    pickerProps.push(props);
    return null;
  },
}));

// `dynamic()` would defer the stub behind a Suspense boundary and render the
// skeleton instead; rendering it straight through keeps the assertions about
// the props, not about loading states.
vi.mock('next/dynamic', () => ({
  default: (
    loader: () => Promise<{ LocationPicker: React.ComponentType<unknown> }>,
  ) => {
    void loader;
    return (props: Record<string, unknown>) => {
      pickerProps.push(props);
      return null;
    };
  },
}));

import { LocationField } from '../LocationField';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  pickerProps.length = 0;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(latitude: string, longitude: string, onChange = vi.fn()) {
  act(() => {
    root.render(
      <LocationField
        latitude={latitude}
        longitude={longitude}
        onChange={onChange}
        scrollWheelZoom={false}
      />,
    );
  });
  return onChange;
}

const input = (id: string) =>
  container.querySelector<HTMLInputElement>(`#${id}`)!;

const buttonLabelled = (label: string) =>
  [...container.querySelectorAll('button')].find((b) =>
    (b.textContent ?? '').includes(label),
  );

const lastPickerProps = () => pickerProps[pickerProps.length - 1];

/** Set an input's value through React's tracked native setter, then fire input. */
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

describe('the inputs remain the keyboard path', () => {
  it('renders both, holding exactly what it was given', () => {
    render('10.6973', '122.5649');

    expect(input('location-lat').value).toBe('10.6973');
    expect(input('location-lng').value).toBe('122.5649');
  });

  it('keeps the other coordinate when one changes', () => {
    const onChange = render('10.6973', '122.5649');

    typeInto(input('location-lat'), '11');

    expect(onChange).toHaveBeenCalledWith({
      latitude: '11',
      longitude: '122.5649',
    });
  });

  it('accepts a half-typed number without eating the keystroke', () => {
    // Values are strings on purpose: a controlled NUMBER input cannot hold
    // "10." on the way to "10.6973", so it swallows the decimal point and the
    // field becomes impossible to type in.
    render('10.', '122.5');

    expect(input('location-lat').value).toBe('10.');
  });
});

describe('the map gets a usable pair, or nothing', () => {
  it('passes both numbers through when both parse', () => {
    render('10.6973', '122.5649');

    expect(lastPickerProps()).toMatchObject({
      latitude: 10.6973,
      longitude: 122.5649,
    });
  });

  it('passes undefined when one is blank', () => {
    render('10.6973', '');

    // A single coordinate would put the pin on the prime meridian.
    expect(lastPickerProps().longitude).toBeUndefined();
  });

  it('passes undefined for junk rather than NaN', () => {
    render('north', 'east');

    expect(lastPickerProps().latitude).toBeUndefined();
    expect(lastPickerProps().longitude).toBeUndefined();
  });

  it('forwards the wheel-zoom switch', () => {
    render('', '');

    // False inside a scrolling dialog: leaflet's wheel zoom would otherwise
    // swallow the scroll and trap the reader mid-form.
    expect(lastPickerProps().scrollWheelZoom).toBe(false);
  });
});

describe('clearing the pin', () => {
  it('is offered only when there is one', () => {
    render('', '');
    expect(buttonLabelled('Clear pin')).toBeUndefined();

    render('10.6973', '122.5649');
    expect(buttonLabelled('Clear pin')).toBeDefined();
  });

  it('empties both, never one', () => {
    const onChange = render('10.6973', '122.5649');

    act(() => buttonLabelled('Clear pin')!.click());

    expect(onChange).toHaveBeenCalledWith({ latitude: '', longitude: '' });
  });
});

describe('device location', () => {
  it('is always offered, pin or no pin', () => {
    render('', '');
    expect(buttonLabelled('Use my location')).toBeDefined();

    render('10.6973', '122.5649');
    expect(buttonLabelled('Use my location')).toBeDefined();
  });
});
