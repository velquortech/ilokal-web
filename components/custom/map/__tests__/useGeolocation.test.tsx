// @vitest-environment happy-dom

/**
 * "Use my location".
 *
 * Was twenty lines duplicated verbatim in the registration wizard and in
 * branch creation, about to become three copies. The claims that matter once
 * it is one hook: six decimal places (what the whole app stores, and what lets
 * a pin round-trip through the DB unchanged), a busy flag that always clears,
 * and a failure message that names the two ways out — a denied permission
 * prompt cannot be re-asked from here.
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useGeolocation } from '../useGeolocation';

let container: HTMLDivElement;
let root: Root;
let located: Array<[number, number]>;

function Harness() {
  const { detect, isDetecting, error, clearError } = useGeolocation(
    (lat, lng) => located.push([lat, lng]),
  );

  return (
    <div>
      <button type="button" data-testid="detect" onClick={detect}>
        {isDetecting ? 'detecting' : 'idle'}
      </button>
      <button type="button" data-testid="clear" onClick={clearError}>
        clear
      </button>
      <p data-testid="error">{error ?? ''}</p>
    </div>
  );
}

const click = (testid: string) =>
  act(() => {
    container
      .querySelector<HTMLButtonElement>(`[data-testid="${testid}"]`)!
      .click();
  });

const text = (testid: string) =>
  container.querySelector(`[data-testid="${testid}"]`)!.textContent ?? '';

beforeEach(() => {
  located = [];
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<Harness />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  // @ts-expect-error — restoring the deleted stub between cases.
  delete navigator.geolocation;
});

function stubGeolocation(
  impl: (success: PositionCallback, failure: PositionErrorCallback) => void,
) {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition: vi.fn(impl) },
  });
}

describe('useGeolocation', () => {
  it('reports the fix at six decimal places', () => {
    stubGeolocation((success) =>
      success({
        coords: { latitude: 10.69731234567, longitude: 122.56491234567 },
      } as GeolocationPosition),
    );

    click('detect');

    // 6dp ≈ 0.1 m — far finer than any phone's fix, and the precision every
    // other coordinate in this app is stored at.
    expect(located).toEqual([[10.697312, 122.564912]]);
  });

  it('clears the busy flag on success', () => {
    stubGeolocation((success) =>
      success({
        coords: { latitude: 1, longitude: 2 },
      } as GeolocationPosition),
    );

    click('detect');

    expect(text('detect')).toBe('idle');
  });

  it('clears the busy flag on failure too', () => {
    stubGeolocation((_success, failure) =>
      failure({ code: 1 } as GeolocationPositionError),
    );

    click('detect');

    // A spinner that never stops is worse than the failure it is hiding.
    expect(text('detect')).toBe('idle');
    expect(text('error')).toContain('Unable to detect location');
  });

  it('names the two ways out when it fails', () => {
    stubGeolocation((_success, failure) =>
      failure({ code: 1 } as GeolocationPositionError),
    );

    click('detect');

    // The prompt cannot be re-asked from here, so the message has to say what
    // the user can do instead.
    expect(text('error')).toContain('Click the map');
    expect(text('error')).toContain('manually');
  });

  it('says so when the browser has no geolocation at all', () => {
    // No stub: `navigator.geolocation` is absent.
    click('detect');

    expect(text('error')).toContain('not supported');
    expect(located).toEqual([]);
  });

  it('drops the message on request', () => {
    stubGeolocation((_success, failure) =>
      failure({ code: 1 } as GeolocationPositionError),
    );
    click('detect');
    expect(text('error')).not.toBe('');

    click('clear');

    // Pinning by hand answers the message, so the caller can retire it.
    expect(text('error')).toBe('');
  });

  it('clears a previous failure when a later attempt starts', () => {
    stubGeolocation((_success, failure) =>
      failure({ code: 1 } as GeolocationPositionError),
    );
    click('detect');
    expect(text('error')).not.toBe('');

    stubGeolocation((success) =>
      success({
        coords: { latitude: 1, longitude: 2 },
      } as GeolocationPosition),
    );
    click('detect');

    expect(text('error')).toBe('');
    expect(located).toEqual([[1, 2]]);
  });
});
