import { test, expect, type Page } from '@playwright/test';
import { DEMO_BUSINESS, signIn } from '../fixtures/accounts';
import { beat, clearBeat, settle } from '../helpers/beat';
import { writeState, runTag } from '../helpers/state';

/**
 * ACT 1 · flow 3 — the shop publishes a coupon and a deal, and they go live.
 *
 * "Goes live" has three conditions and all are required: status='published'
 * AND archived_at IS NULL AND start_date <= now(). Miss one and the promo is
 * silently invisible to customers — a failure that looks exactly like a bug in
 * the feed. So this spec asserts PUBLIC VISIBILITY, never "the row saved".
 *
 * The draft case is asserted too, in the negative: a promo held back must NOT
 * leak to the public surfaces. That is the half of the feature a happy-path
 * demo never checks.
 */

/** `datetime-local` wants `YYYY-MM-DDTHH:mm`, in the field's own local time. */
function localDateTime(offsetMs: number): string {
  const d = new Date(Date.now() + offsetMs);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface PromoInput {
  code: string;
  description: string;
  type: 'Coupon' | 'Deal';
  visibility: 'Draft' | 'Published';
  percent: string;
}

async function fillPromoDialog(page: Page, input: PromoInput): Promise<void> {
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Add Coupon or Deal')).toBeVisible({
    timeout: 15_000,
  });

  // Type and Visibility are plain buttons in a 2-up grid, not a radio group.
  // Each button's accessible name is its label PLUS its helper text ("Coupon
  // Code-based discount customers enter to redeem"), so match on the leading
  // label rather than the whole string.
  await dialog
    .getByRole('button', { name: new RegExp(`^${input.type}\\b`) })
    .click();
  await dialog
    .getByRole('button', { name: new RegExp(`^${input.visibility}\\b`) })
    .click();

  await dialog.getByPlaceholder('e.g. SUMMER20').fill(input.code);
  await dialog
    .getByPlaceholder('Brief description for your customers')
    .fill(input.description);
  // `exact: true` matters: getByPlaceholder does SUBSTRING matching by default,
  // and the Code field's placeholder ("e.g. SUMMER20") contains a "0" — so a
  // loose match writes the discount percentage into the coupon code.
  await dialog.getByPlaceholder('0', { exact: true }).fill(input.percent);

  // start_date in the PAST — a promo that starts later is correctly invisible,
  // and that is the single easiest way to make this demo silently show nothing.
  await dialog
    .locator('input[type="datetime-local"]')
    .first()
    .fill(localDateTime(-60 * 60 * 1000));
  await dialog
    .locator('input[type="datetime-local"]')
    .last()
    .fill(localDateTime(30 * 24 * 60 * 60 * 1000));

  // The caption sits bottom-centre, which is exactly where a dialog footer
  // lands. It is `pointer-events: none` so it never blocks the click, but on
  // video it would cover the button being pressed.
  await clearBeat(page);
  await dialog
    .getByRole('button', { name: /^(create|save|add)/i })
    .last()
    .click();
  await expect(page.getByRole('dialog')).toBeHidden({ timeout: 30_000 });
  await settle(page);
}

test.describe('Owner · coupons and deals', () => {
  test('publishes a coupon and a deal, and a draft stays private', async ({
    page,
  }) => {
    const tag = runTag();
    const couponCode = `E2E${tag}`;
    const dealCode = `DEAL${tag}`;
    const draftCode = `DRAFT${tag}`;

    // The PUBLIC coupon card renders the discount, the description and the
    // expiry — deliberately NOT the coupon code, which only the owner's table
    // shows. So the public assertions below key on description text, tagged per
    // run so a previous run's rows cannot satisfy them.
    const couponBlurb = `20% off any brewed coffee (${tag})`;
    const dealBlurb = `Merienda hour - 15% off all pastries (${tag})`;
    const draftBlurb = `Fiesta special, not announced yet (${tag})`;

    await signIn(page, 'owner');
    await page.goto(`/business/${DEMO_BUSINESS.id}/coupons`);
    await settle(page);
    await beat(page, 'Coupons & Deals — the shop’s promotions');

    // ── 1. A published coupon ───────────────────────────────────────────────
    await beat(page, 'Create a coupon customers can redeem');
    await page
      .getByRole('button', { name: /add coupons or deals/i })
      .first()
      .click();
    await fillPromoDialog(page, {
      code: couponCode,
      description: couponBlurb,
      type: 'Coupon',
      visibility: 'Published',
      percent: '20',
    });
    await expect(page.getByText(couponCode).first()).toBeVisible({
      timeout: 20_000,
    });
    await beat(page, 'Published — live immediately');

    // ── 2. A published deal ─────────────────────────────────────────────────
    await beat(page, 'A "deal" is different — it goes to the deals wall');
    await page
      .getByRole('button', { name: /add coupons or deals/i })
      .first()
      .click();
    await fillPromoDialog(page, {
      code: dealCode,
      description: dealBlurb,
      type: 'Deal',
      visibility: 'Published',
      percent: '15',
    });
    await expect(page.getByText(dealCode).first()).toBeVisible({
      timeout: 20_000,
    });

    // ── 3. A draft, which must NOT go live ──────────────────────────────────
    await beat(page, 'And one held back as a draft — not ready yet');
    await page
      .getByRole('button', { name: /add coupons or deals/i })
      .first()
      .click();
    await fillPromoDialog(page, {
      code: draftCode,
      description: draftBlurb,
      type: 'Coupon',
      visibility: 'Draft',
      percent: '30',
    });
    await expect(page.getByText(draftCode).first()).toBeVisible({
      timeout: 20_000,
    });
    await beat(page, 'Three promos — two live, one draft');

    // ── 4. Live on the public shop page ─────────────────────────────────────
    await beat(page, 'Now check what a customer actually sees');
    await page.goto(`/explore/${DEMO_BUSINESS.id}`);
    await settle(page);
    await expect(page.getByText(couponBlurb).first()).toBeVisible({
      timeout: 20_000,
    });
    await beat(page, 'The published coupon is live on the shop page');

    // The negative assertion — the whole point of a draft state.
    await expect(page.getByText(draftBlurb)).toHaveCount(0);
    await beat(page, 'The draft is not — exactly as intended');

    // ── 5. The deal reaches the deals wall ──────────────────────────────────
    //
    // The wall is RANKED, not chronological: `mobile_deals` puts businesses on
    // a `features_promo_boost` plan first. A shop without a subscription is not
    // missing — it is further down, and past the 20-per-page cut with enough
    // live deals in the system. So walk the pages instead of asserting page 1,
    // which would only pass for a promoted shop and would quietly mean
    // "promoted" rather than "live".
    await beat(page, 'And the deal lands on the public deals wall');

    let foundOnWall = false;
    for (let p = 1; p <= 4 && !foundOnWall; p++) {
      await page.goto(p === 1 ? '/explore/deals' : `/explore/deals?page=${p}`);
      await settle(page);
      // A draft must never appear on any page of the wall.
      await expect(page.getByText(draftBlurb)).toHaveCount(0);
      foundOnWall = (await page.getByText(dealBlurb).count()) > 0;
    }

    expect(
      foundOnWall,
      'the published deal never appeared on /explore/deals',
    ).toBe(true);
    await expect(page.getByText(dealBlurb).first()).toBeVisible({
      timeout: 15_000,
    });
    await beat(page, 'Live on /explore/deals', 1600);

    writeState({ couponCode, dealCode, couponBlurb });
  });
});
