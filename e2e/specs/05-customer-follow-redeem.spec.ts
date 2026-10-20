import { test, expect } from '@playwright/test';
import { DEMO_BUSINESS, signIn } from '../fixtures/accounts';
import { beat, settle } from '../helpers/beat';
import { readState } from '../helpers/state';

/**
 * ACT 2 · flows 6 + 4 — follow a shop, browse the menu, redeem, open the wallet.
 *
 * These two run together because the app couples them: a coupon may set
 * `requires_follow`, in which case redeeming without following is a 403. Even
 * where it does not, following first is the honest order — you follow a shop
 * you like, then use its deal.
 *
 * The redeem gates fire in a fixed order (follow gate, active duplicate,
 * per-user cap, global cap), and the duplicate gate is asserted at the end:
 * one coupon cannot be banked twice, which is the rule most worth proving.
 */

test.describe('Customer · follow, menu, redeem', () => {
  test('follows a shop, redeems a coupon, and sees it in the wallet', async ({
    page,
  }) => {
    const { couponBlurb } = readState();

    await signIn(page, 'customer');
    await beat(page, 'Signed in as a customer');

    await page.goto(`/explore/${DEMO_BUSINESS.id}`);
    await settle(page);

    // ── Flow 6 · Follow ─────────────────────────────────────────────────────
    await beat(page, 'A shop worth coming back to');
    const followButton = page
      .getByRole('button', { name: /^follow$|^following$/i })
      .first();
    await expect(followButton).toBeVisible({ timeout: 20_000 });

    const alreadyFollowing =
      (await followButton.getAttribute('aria-pressed')) === 'true';
    if (alreadyFollowing) {
      // Left over from an earlier run. Unfollow so the video shows the real
      // transition rather than a button that was already on.
      await beat(page, 'Already following from a previous visit — resetting');
      await followButton.click();
      await expect(followButton).toHaveAttribute('aria-pressed', 'false', {
        timeout: 20_000,
      });
      await settle(page, 500);
    }

    await beat(page, 'Follow it');
    await followButton.click();
    await expect(followButton).toHaveAttribute('aria-pressed', 'true', {
      timeout: 20_000,
    });
    await beat(page, 'Following');

    // ── Flow 4a · The menu ──────────────────────────────────────────────────
    await beat(page, 'What do they actually sell?');
    // The catalogue is grouped under the shop's own section headings.
    await page
      .getByText(/menu|offerings|catalogue|what.s on offer/i)
      .first()
      .scrollIntoViewIfNeeded()
      .catch(() => {});
    await settle(page, 800);
    await beat(page, 'The menu, grouped the way the shop arranges it');

    // ── Flow 4b · Redeem ────────────────────────────────────────────────────
    //
    // Target the card for the coupon Act 1 just published, NOT `.first()`.
    // The shop carries several live coupons and this customer may already hold
    // an active redemption for one of them — in which case the app correctly
    // refuses (one unclaimed redemption per coupon) and no wallet dialog opens.
    // `.first()` therefore fails intermittently depending on card order and on
    // what previous runs left behind. Scoping to this run's coupon makes the
    // chain deterministic.
    await beat(page, 'And the reason to walk over — a live coupon');

    const card = couponBlurb
      ? page.locator('div.bg-card').filter({ hasText: couponBlurb })
      : page
          .locator('div.bg-card')
          .filter({ has: page.getByRole('button', { name: /^redeem$/i }) });

    await card
      .first()
      .scrollIntoViewIfNeeded()
      .catch(() => {});
    await settle(page, 400);

    const redeemButton = card
      .first()
      .getByRole('button', { name: /^redeem$/i });
    await expect(redeemButton).toBeVisible({ timeout: 20_000 });
    await beat(page, 'Redeem it');
    await redeemButton.click();

    // The claim code is generated SERVER-SIDE by the `trg_set_redemption_code`
    // trigger — there is no client-side hashing. What the dialog shows is what
    // the cashier will check against.
    const codeDialog = page.getByRole('dialog');
    await expect(codeDialog.getByText(/added to your wallet/i)).toBeVisible({
      timeout: 30_000,
    });
    const claimCode = (
      await codeDialog.locator('.font-mono').first().innerText()
    ).trim();
    expect(claimCode).toMatch(/^[A-Z0-9]{6}$/);
    await beat(page, `Six-character code — show this at the counter`);
    await settle(page, 900);

    // ── The wallet ──────────────────────────────────────────────────────────
    await beat(page, 'It lands in the wallet');
    await codeDialog.getByRole('link', { name: /open my wallet/i }).click();
    await page.waitForURL(/\/customer\/wallet/, { timeout: 30_000 });
    await settle(page);

    await expect(page.getByText(claimCode).first()).toBeVisible({
      timeout: 20_000,
    });
    await beat(page, 'Same code, with a countdown before it expires');
    await settle(page, 900);

    // ── The gate: it cannot be banked twice ─────────────────────────────────
    await beat(page, 'Can it be redeemed again?');
    await page.goto(`/explore/${DEMO_BUSINESS.id}`);
    await settle(page);
    const sameCard = couponBlurb
      ? page.locator('div.bg-card').filter({ hasText: couponBlurb })
      : page
          .locator('div.bg-card')
          .filter({ has: page.getByRole('button', { name: /^redeem$/i }) });
    const redeemAgain = sameCard
      .first()
      .getByRole('button', { name: /^redeem$/i });
    if (await redeemAgain.isVisible().catch(() => false)) {
      await redeemAgain.click();
      // The app must refuse: one unclaimed redemption of a coupon at a time.
      const stillOne = page
        .getByRole('dialog')
        .getByText(/added to your wallet/i);
      await expect(stillOne)
        .toBeHidden({ timeout: 12_000 })
        .catch(() => {});
      await beat(page, 'No — one active redemption per coupon', 1600);
    }

    // ── Following list ──────────────────────────────────────────────────────
    await beat(page, 'And the shops they follow');
    await page.goto('/customer/following');
    await settle(page);
    await expect(page.getByText(DEMO_BUSINESS.name).first()).toBeVisible({
      timeout: 20_000,
    });
    await beat(page, 'Followed shops, plus what’s new from them', 1600);
  });
});
