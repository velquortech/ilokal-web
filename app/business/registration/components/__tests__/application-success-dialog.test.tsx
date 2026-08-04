// @vitest-environment happy-dom

/**
 * The last screen before the dashboard.
 *
 * It used to hardcode "under review" and a 24–48 hour timeline while
 * `auto_verify_businesses` (seeded TRUE) had already published the shop — so
 * the owner was told to wait for an approval that had happened, then landed on
 * a dashboard for a live shop. These tests pin the fork, and pin the
 * destination: the welcome marker has to be appended to the shop's own path,
 * because `/business` answers with a fresh `redirect()` that drops every
 * search param.
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApplicationSuccessDialog } from '../application-success-dialog';
import { ROUTES, businessWelcomePath } from '@/config/routeConfig';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }),
}));

const BUSINESS_ID = '550e8400-e29b-41d4-a716-446655440000';

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
  document.body.innerHTML = '';
});

function render(props: { businessId: string | null; status: string | null }) {
  act(() => {
    root.render(
      React.createElement(ApplicationSuccessDialog, {
        open: true,
        onOpenChange: vi.fn(),
        ...props,
      }),
    );
  });
  // Radix portals the content out of `container`.
  return document.body.textContent ?? '';
}

const primaryButton = () =>
  Array.from(document.body.querySelectorAll('button')).find((button) =>
    /dashboard/i.test(button.textContent ?? ''),
  )!;

describe('ApplicationSuccessDialog', () => {
  it('tells a verified shop it is live, with no review timeline', () => {
    const text = render({ businessId: BUSINESS_ID, status: 'verified' });

    expect(text).toContain('Your shop is live!');
    expect(text).not.toContain('under review');
    expect(text).not.toContain('Under Review');
    // The timing breakdown only makes sense while there is a review to wait for.
    expect(text).not.toContain('Review Process');
  });

  it('keeps the review timeline for a shop that is genuinely pending', () => {
    const text = render({ businessId: BUSINESS_ID, status: 'pending' });

    expect(text).toContain('under review');
    expect(text).toContain('Under Review');
    expect(text).toContain('Review Process');
    expect(text).not.toContain('Your shop is live!');
  });

  it('claims neither state when the status is unknown', () => {
    // Reachable on a resumed submit, where the row already existed and was
    // never read back. Guessing "under review" would be the original bug.
    const text = render({ businessId: BUSINESS_ID, status: null });

    expect(text).toContain('has been received');
    expect(text).not.toContain('Your shop is live!');
    expect(text).not.toContain('under review');
  });

  it('sends the owner to their own dashboard carrying the welcome marker', () => {
    render({ businessId: BUSINESS_ID, status: 'verified' });

    act(() => primaryButton().click());

    expect(push).toHaveBeenCalledWith(businessWelcomePath(BUSINESS_ID));
    // Not `/business`: that resolver redirects and drops the query string.
    expect(push).not.toHaveBeenCalledWith(ROUTES.BUSINESS.home);
  });

  it('still lands the owner somewhere when the id was lost', () => {
    render({ businessId: null, status: 'pending' });

    act(() => primaryButton().click());

    expect(push).toHaveBeenCalledWith(ROUTES.BUSINESS.home);
  });
});
