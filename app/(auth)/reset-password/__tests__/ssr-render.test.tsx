// @vitest-environment happy-dom

/**
 * The /reset-password page must ship its form in the SSR HTML.
 *
 * Regression: the page used to read `token_hash` via `useSearchParams()`
 * inside a Suspense boundary. That opt-out of prerendering made the shipped
 * document contain only the fallback spinner, so a user opening their reset
 * link with slow or blocked JS saw a spinner and no form at all — the fields
 * existed only after client-side hydration.
 *
 * The fix reads `searchParams` in the server component and hands the token to
 * the form as a prop. This test renders the actual page component through
 * `renderToStaticMarkup` (the same "what ships" lens as the dashboard render
 * tests) and asserts the password fields are in the HTML from the first byte.
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

vi.mock('sonner', () => ({
  toast: { success: vi.fn() },
}));

import ResetPasswordPage from '@/app/(auth)/reset-password/page';

const html = async (tokenHash?: string) => {
  // The page awaits searchParams (Next 15 Promise form) — mirror that.
  const element = await ResetPasswordPage({
    searchParams: Promise.resolve(tokenHash ? { token_hash: tokenHash } : {}),
  });
  return renderToStaticMarkup(element);
};

/**
 * The pre-fix page shipped ONLY a Suspense fallback spinner. These negative
 * checks are intentionally strict: if the form ever legitimately renders a
 * loading indicator at rest, relax them deliberately — the positive
 * assertions above are the real regression signal.
 */
function expectNoFallback(markup: string) {
  expect(markup).not.toContain('animate-spin');
  expect(markup).not.toContain('Loading');
}

describe('/reset-password ships its form in the SSR HTML', () => {
  it('renders both password fields when the reset link has a token_hash', async () => {
    const markup = await html('TOKEN123');

    expect(markup).toContain('id="password"');
    expect(markup).toContain('id="confirmPassword"');
    expect(markup).toContain('Choose a new password');
    expect(markup).toContain('Update password');
    // The pre-fix page shipped only the Suspense fallback spinner.
    expectNoFallback(markup);
  });

  it('ships the invalid-link state, not a spinner, when token_hash is missing', async () => {
    const markup = await html();

    expect(markup).toContain('invalid or incomplete');
    expect(markup).not.toContain('id="password"');
    expectNoFallback(markup);
  });
});
