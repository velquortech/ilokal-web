// @vitest-environment happy-dom

/**
 * The /signup page must ship its form in the SSR HTML.
 *
 * Regression: the page used to read `mobile`/`next` via `useSearchParams()`
 * inside a Suspense boundary with an EMPTY fallback — so on a production
 * build the shipped document contained NOTHING of the form, and it appeared
 * only after client-side hydration. Any delay or JS failure left a blank
 * page.
 *
 * The fix reads `searchParams` in the server component and hands the values
 * to the form as props. This test renders the actual page component through
 * `renderToStaticMarkup` (the same "what ships" lens as the dashboard render
 * tests) and asserts the account-type step is in the HTML from the first byte.
 *
 * Note: signup is a two-step flow — the shipped HTML is the account-type
 * step ("Business Owner" / "Customer" + Continue). The name/email/password
 * fields render only after the user clicks Continue, so they are NOT expected
 * here.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

// The server action is only invoked from an event handler; stub it so
// importing the page never touches the network during an SSR render.
vi.mock('@/app/(auth)/actions', () => ({
  signupFormAction: vi.fn(),
}));

import SignupPage from '@/app/(auth)/signup/page';

const html = async (sp: { mobile?: string; next?: string } = {}) => {
  // The page awaits searchParams (Next 15 Promise form) — mirror that.
  const element = await SignupPage({ searchParams: Promise.resolve(sp) });
  return renderToStaticMarkup(element);
};

/**
 * The pre-fix page shipped an EMPTY document (blank Suspense fallback). These
 * negative checks are intentionally strict: if the form ever legitimately
 * renders a loading indicator at rest, relax them deliberately — the positive
 * assertions above are the real regression signal.
 */
function expectNoFallback(markup: string) {
  expect(markup).not.toContain('animate-spin');
  expect(markup).not.toContain('Loading');
}

describe('/signup ships its form in the SSR HTML', () => {
  it('ships the account-type step — heading, both roles, and Continue', async () => {
    const markup = await html();

    expect(markup).toContain('Create Account');
    expect(markup).toContain('What type of account are you?');
    expect(markup).toContain('Business Owner');
    expect(markup).toContain('Customer');
    expect(markup).toContain('Continue');
    expectNoFallback(markup);
  });

  it('ships the account-type step for mobile app signups too (?mobile=true)', async () => {
    const markup = await html({ mobile: 'true' });

    expect(markup).toContain('Create Account');
    expect(markup).toContain('Business Owner');
    expect(markup).toContain('Continue');
    expectNoFallback(markup);
  });
});
