// @vitest-environment happy-dom

/**
 * The post-registration setup card.
 *
 * The behaviours worth pinning are the ones that lie when they break: a failed
 * read must NOT render as unchecked boxes (that tells the owner to redo
 * finished work), the welcome marker must be consumed exactly once (a
 * refreshable welcome is a welcome that never ends), and dismissal is keyed
 * per business (an owner with two shops sets up each one).
 *
 * Driven with `react-dom/client` + happy-dom, per repo convention — the stack
 * is frozen and @testing-library's peer isn't installed.
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SetupChecklist } from '../SetupChecklist';
import type { OnboardingProgress } from '@/lib/types/onboarding';

const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => React.createElement('a', { href, ...rest }, children),
}));

const BUSINESS_ID = '550e8400-e29b-41d4-a716-446655440000';

const progressWith = (
  overrides: Partial<OnboardingProgress> = {},
): OnboardingProgress => ({
  items: [
    {
      id: 'profile',
      label: 'Complete your shop profile',
      detail: 'Logo, banner and a description.',
      done: true,
      href: `/business/${BUSINESS_ID}/profile`,
    },
    {
      id: 'offering',
      label: 'Add Product',
      detail: 'Your shop page is empty until it has one.',
      done: false,
      href: `/business/${BUSINESS_ID}/product-catalogues`,
    },
    {
      id: 'verification',
      label: 'Verification in review',
      detail: 'Nothing to do.',
      done: false,
      href: `/business/${BUSINESS_ID}/profile`,
      readOnly: true,
      status: 'pending',
    },
  ],
  completed: 1,
  total: 2,
  complete: false,
  failed: false,
  offeringCount: 0,
  ...overrides,
});

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(props: Partial<React.ComponentProps<typeof SetupChecklist>>) {
  act(() => {
    root.render(
      React.createElement(SetupChecklist, {
        businessId: BUSINESS_ID,
        progress: progressWith(),
        ...props,
      } as React.ComponentProps<typeof SetupChecklist>),
    );
  });
}

describe('SetupChecklist', () => {
  it('renders one row per item and the actionable ratio', () => {
    render({});

    expect(container.querySelectorAll('li')).toHaveLength(3);
    expect(container.textContent).toContain('1 of 2 done');
  });

  it('says an outage happened instead of showing unchecked boxes', () => {
    render({ progress: progressWith({ failed: true, items: [] }) });

    expect(container.textContent).toContain(
      'couldn’t load your setup checklist',
    );
    // The failure copy replaces the list entirely — a checklist rendered from
    // nothing reads as "you have done none of this".
    expect(container.querySelectorAll('li')).toHaveLength(0);
    expect(container.textContent).not.toContain('done');
  });

  it('renders nothing once every actionable step is complete', () => {
    render({ progress: progressWith({ complete: true, completed: 2 }) });

    expect(container.innerHTML).toBe('');
  });

  it('still shows the card on the welcome arrival, even when complete', () => {
    render({
      progress: progressWith({ complete: true, completed: 2 }),
      welcome: true,
      cleanUrl: `/business/${BUSINESS_ID}`,
    });

    expect(container.textContent).toContain('Your shop is registered');
  });

  it('consumes the welcome marker by replacing the URL, once', () => {
    const cleanUrl = `/business/${BUSINESS_ID}?branch=abc`;
    render({ welcome: true, cleanUrl });

    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith(cleanUrl, { scroll: false });
  });

  it('does not touch the URL when there is no welcome marker', () => {
    render({});

    expect(replace).not.toHaveBeenCalled();
  });

  it('hides on dismiss and stays hidden, keyed per business', () => {
    render({});

    const hide = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Hide',
    )!;
    act(() => hide.click());

    expect(container.innerHTML).toBe('');
    expect(
      window.localStorage.getItem(`ilokal-onboarding-hidden:${BUSINESS_ID}`),
    ).toBe('1');

    // A different shop under the same owner is a different setup.
    render({ businessId: 'other-shop-id' });
    expect(container.innerHTML).not.toBe('');
  });

  it('gives every row a real destination', () => {
    render({});

    const links = Array.from(container.querySelectorAll('a'));
    expect(links).toHaveLength(3);
    for (const link of links) {
      expect(link.getAttribute('href')).toMatch(
        new RegExp(`^/business/${BUSINESS_ID}/`),
      );
    }
  });

  it('states done-ness in text, not only as a tick', () => {
    render({});

    // Every tick is aria-hidden, so the status has to be readable some other
    // way or the list announces as identical rows.
    expect(container.textContent).toContain('— done');
    expect(container.textContent).toContain('— not done yet');
  });
});
