import { expect, type Page } from '@playwright/test';

/**
 * Seeded dev accounts (supabase/seeds/users.sql). Password is in git on
 * purpose — these exist only on a local stack.
 *
 * Note `testuser` is `role='app_user'`, which is what `/customer/**` requires.
 * The seed file's own header comment says "role: user"; that comment is wrong,
 * the INSERT is `app_user` (users.sql:134).
 */
export const ACCOUNTS = {
  owner: {
    email: 'owner@ilokal.dev',
    password: 'ilokal@dev',
    role: 'business_owner',
  },
  customer: {
    email: 'testuser@ilokal.dev',
    password: 'ilokal@dev',
    role: 'app_user',
  },
  admin: {
    email: 'admin@ilokal.dev',
    password: 'ilokal@dev',
    role: 'admin',
  },
} as const;

export type AccountKey = keyof typeof ACCOUNTS;

/**
 * The shop the walkthrough follows: Iloilo Street Eats — 20 products, so the
 * menu, the catalogue and the analytics dashboard all have something to show.
 *
 * This is deliberately NOT the shop the old `.limit(1)` fallback resolved to
 * (that was The Artisan Roastery, `…101`). Running the suite against a shop the
 * fallback would never have returned is what proves the multi-shop fix: if any
 * business action ever drops its `businessId` argument again, the owner specs
 * land on the wrong shop and fail. The owner holds 21 businesses, which is what
 * makes that a real test rather than a coincidence.
 *
 * Must match `E2E_DEMO_BUSINESS` in the Makefile.
 */
export const DEMO_BUSINESS = {
  id: '11111111-1111-1111-1111-111111111107',
  name: 'Iloilo Street Eats',
} as const;

/**
 * Sign in through the real form. There is one door (`/sign-in`) and the
 * account's role decides where it lands — customer to `/explore`, owner to
 * `/business/[id]`.
 */
export async function signIn(page: Page, key: AccountKey): Promise<void> {
  const account = ACCOUNTS[key];

  await page.goto('/sign-in');
  await page.locator('#email').fill(account.email);
  await page.locator('#password').fill(account.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  // Landing on a post-auth route is the proof; asserting it here means a
  // broken login fails in the helper rather than as a confusing selector
  // timeout three steps into a spec.
  await expect(page).not.toHaveURL(/\/sign-in/, { timeout: 30_000 });
}

/** Sign out via the account menu, so the next act starts clean. */
export async function signOut(page: Page): Promise<void> {
  await page.goto('/');
  const trigger = page
    .getByRole('button', { name: /account|menu|profile/i })
    .first();
  if (await trigger.isVisible().catch(() => false)) {
    await trigger.click();
    const logout = page.getByRole('menuitem', { name: /log ?out|sign ?out/i });
    if (await logout.isVisible().catch(() => false)) {
      await logout.click();
      await expect(page).toHaveURL(/\/sign-in|\/home|\/$/, { timeout: 20_000 });
      return;
    }
  }
  // Fallback: drop the session cookies directly.
  await page.context().clearCookies();
}
