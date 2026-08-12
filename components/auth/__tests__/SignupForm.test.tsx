// @vitest-environment happy-dom

/**
 * Which account type signup starts on.
 *
 * A one-line default, but a product decision worth pinning: signup is reached
 * almost entirely from the "List your business" CTAs — a shopper can browse,
 * search and read every shop page without an account — so the person who
 * arrives here on purpose is usually an owner. It is also the costlier default
 * to get wrong in one direction: an owner who misses the toggle ends up with an
 * account that cannot register a shop.
 *
 * `react-dom/client` + happy-dom, per repo convention.
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('@/app/(auth)/actions', () => ({
  signupFormAction: vi.fn().mockResolvedValue({}),
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href }, children),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import SignupForm from '../SignupForm';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<SignupForm />));
});

afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

/** Radix renders its radios as buttons carrying the checked state in ARIA. */
const radio = (value: string) =>
  document.querySelector<HTMLElement>(`[role="radio"][value="${value}"]`);

describe('SignupForm — account type', () => {
  it('starts on Business Owner', () => {
    expect(radio('business_owner')?.getAttribute('aria-checked')).toBe('true');
  });

  it('leaves Customer selectable, not preselected', () => {
    // Both doors stay open — this is a default, not a restriction.
    expect(radio('app_user')).not.toBeNull();
    expect(radio('app_user')?.getAttribute('aria-checked')).toBe('false');
  });

  it('offers exactly the two public account types', () => {
    // `admin` is in the Zod enum but must never be selectable here.
    const values = Array.from(document.querySelectorAll('[role="radio"]')).map(
      (el) => el.getAttribute('value'),
    );

    expect(values).toEqual(['business_owner', 'app_user']);
  });
});
