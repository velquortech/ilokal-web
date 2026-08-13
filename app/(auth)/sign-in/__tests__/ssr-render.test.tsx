// @vitest-environment happy-dom

/**
 * The /sign-in page must ship its form in the SSR HTML.
 *
 * Regression: the page used to read `next`/`mfa` via `useSearchParams()`
 * inside a Suspense boundary. That opt-out of prerendering made the shipped
 * document contain only the fallback skeleton ("Loading sign-in form"), so on
 * a production build the fields depended entirely on client-side hydration —
 * any delay or JS failure left a page with no form at all.
 *
 * The fix reads `searchParams` in the server component and hands the values
 * to the form as props. This test renders the actual page component through
 * `renderToStaticMarkup` (the same "what ships" lens as the dashboard render
 * tests) and asserts the fields are in the HTML from the first byte.
 */

import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';

vi.mock('motion/react', () => ({
  motion: new Proxy(
    {},
    {
      get:
        () =>
        ({
          children,
          ...props
        }: React.PropsWithChildren<Record<string, unknown>>) => {
          const { initial, animate, transition, exit, ...rest } = props;
          void initial;
          void animate;
          void transition;
          void exit;
          return <div {...rest}>{children}</div>;
        },
    },
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Server actions are only invoked from event handlers; stub them so importing
// the page never touches the network during an SSR render.
vi.mock('@/app/(auth)/actions', () => ({
  signInAction: vi.fn(),
  redirectByRole: vi.fn(),
  signOutAction: vi.fn(),
  checkMFARequiredAction: vi.fn(),
  verifyMFALoginAction: vi.fn(),
}));

import SignInPage from '@/app/(auth)/sign-in/page';

const html = async (sp: { next?: string; mfa?: string } = {}) => {
  // The page awaits searchParams (Next 15 Promise form) — mirror that.
  const element = await SignInPage({ searchParams: Promise.resolve(sp) });
  return renderToStaticMarkup(element);
};

/**
 * The pre-fix page shipped ONLY the "Loading sign-in form" Suspense fallback.
 * These negative checks are intentionally strict: if the form ever
 * legitimately renders a loading indicator at rest, relax them deliberately —
 * the positive assertions above are the real regression signal.
 */
function expectNoFallback(markup: string) {
  expect(markup).not.toContain('animate-spin');
  expect(markup).not.toContain('Loading sign-in form');
}

describe('/sign-in ships its form in the SSR HTML', () => {
  it('renders the email and password fields from the first byte', async () => {
    const markup = await html();

    expect(markup).toContain('id="email"');
    expect(markup).toContain('id="password"');
    expect(markup).toContain('Welcome back');
    expect(markup).toContain('Sign in');
    expectNoFallback(markup);
  });

  it('ships the MFA-nudge banner when the proxy bounced ?mfa=required', async () => {
    const markup = await html({ mfa: 'required' });

    // renderToStaticMarkup HTML-escapes the apostrophe (wasn&#x27;t) — assert
    // on an apostrophe-free phrase from the banner.
    expect(markup).toContain(
      'Sign in again and enter the code from your authenticator app',
    );
    expect(markup).toContain('id="email"');
    expect(markup).toContain('id="password"');
    expectNoFallback(markup);
  });
});
