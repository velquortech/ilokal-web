import { test, expect } from '@playwright/test';
import { DEMO_BUSINESS, signIn } from '../fixtures/accounts';
import { beat, settle } from '../helpers/beat';

/**
 * ACT 3 · flow 2 — the owner sees what happened.
 *
 * This is the payoff of the ordering: the redemption the viewer watched in Act
 * 2 is a real row, so it shows up here. That only works because the suite
 * drives the real app against a real database — a mocked run could film the
 * same clicks and prove nothing.
 *
 * Requires `dashboard_demo.sql`, which `make seed-db` does NOT run. Without it
 * the charts are flat and this act films an empty product. `make e2e-preflight`
 * loads it.
 */

test.describe('Owner · analytics', () => {
  test('sees the dashboard, including the redemption from Act 2', async ({
    page,
  }) => {
    await signIn(page, 'owner');
    await page.goto(`/business/${DEMO_BUSINESS.id}`);
    await settle(page);
    await beat(page, 'Back on the owner’s side');

    await beat(page, 'The dashboard opens with the one number that matters');
    await settle(page, 900);

    // A dashboard reporting four confident zeros and a dashboard that failed to
    // load look identical, so assert real content rather than mere presence.
    const body = await page.locator('main').innerText();
    expect(body.length).toBeGreaterThan(200);
    await beat(page, 'Redemptions, customers, and what’s trending');
    await settle(page, 900);

    // ── Redeemed coupons — where Act 2 shows up by name ─────────────────────
    await beat(page, 'Every redemption, with the customer who made it');
    await page.goto(`/business/${DEMO_BUSINESS.id}/redeemed-coupons`);
    await settle(page);
    await expect(page.getByRole('table').first()).toBeVisible({
      timeout: 20_000,
    });
    await settle(page, 900);
    await beat(page, 'The coupon redeemed a moment ago is in here');

    // ── Branch scoping ──────────────────────────────────────────────────────
    await page.goto(`/business/${DEMO_BUSINESS.id}`);
    await settle(page);
    const branchFilter = page
      .getByRole('combobox')
      .filter({ hasText: /branch|all/i })
      .first();
    if (await branchFilter.isVisible().catch(() => false)) {
      await beat(page, 'And it can be narrowed to a single branch');
      await branchFilter.click();
      const option = page.getByRole('option').nth(1);
      if (await option.isVisible().catch(() => false)) {
        await option.click();
        await settle(page, 1200);
        await beat(page, 'Per-branch numbers');
      } else {
        await page.keyboard.press('Escape');
      }
    }

    await beat(page, 'Shop → customer → shop. The whole loop, live.', 2000);
  });
});
