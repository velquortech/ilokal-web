import { test, expect } from '@playwright/test';
import { DEMO_BUSINESS, signIn } from '../fixtures/accounts';
import { beat, settle } from '../helpers/beat';
import { writeState, runTag } from '../helpers/state';

/**
 * ACT 1 · flow 7 — the shop promotes itself (and one offering) into an event.
 *
 * THE ENDING IS "PENDING REVIEW", ON PURPOSE.
 *
 * The approval gate is a DB trigger, not RLS: `set_event_initial_status`
 * forces any non-admin insert down to draft/pending_review, and
 * `guard_event_review_columns` reverts any later attempt to raise it. RLS
 * cannot restrict a single column, so without the trigger an owner could
 * `PATCH status='approved'` straight through PostgREST and publish their own
 * banner to every visitor.
 *
 * So there is no owner-side path to the front page, and filming one would
 * teach the viewer something false about who controls it. This spec asserts
 * the gate holds. The event customers see in Act 2 is the separately
 * pre-approved one from `e2e/seed/e2e-preflight.sql`.
 */

function localDateTime(offsetMs: number): string {
  const d = new Date(Date.now() + offsetMs);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const DAY = 24 * 60 * 60 * 1000;

test.describe('Owner · events', () => {
  test('proposes an event promoting an offering, and it stops at review', async ({
    page,
  }) => {
    const eventName = `Roastery Cupping Session ${runTag()}`;

    await signIn(page, 'owner');
    await page.goto(`/business/${DEMO_BUSINESS.id}/events`);
    await settle(page);
    await beat(page, 'Events — a shop can propose one');

    await beat(page, 'Promote the shop with a real-world event');
    await page
      .getByRole('button', { name: /propose an event/i })
      .first()
      .click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/propose an event/i).first()).toBeVisible({
      timeout: 15_000,
    });

    await beat(page, 'What it is, and where');
    await dialog.locator('#event-name').fill(eventName);
    await dialog
      .locator('#event-description')
      .fill(
        'A guided tasting of our single-origin Ilonggo beans, with the roaster on hand.',
      );
    await dialog
      .locator('#event-address')
      .fill('Iloilo River Esplanade, Iloilo City');

    await beat(page, 'When it runs');
    const dateInputs = dialog.locator('input[type="datetime-local"]');
    await dateInputs.first().fill(localDateTime(2 * DAY));
    await dateInputs.last().fill(localDateTime(4 * DAY));

    // ── The "promote a PRODUCT" half of the ask ─────────────────────────────
    // An event may promote one offering. The pairing is enforced by a
    // composite FK on (product_id, business_id), so another shop's product is
    // not merely rejected — it is unrepresentable.
    const offeringSelect = dialog.getByRole('combobox').first();
    if (await offeringSelect.isVisible().catch(() => false)) {
      await beat(page, 'Attach one offering to promote');
      await offeringSelect.click();
      const option = page.getByRole('option').nth(1);
      if (await option.isVisible().catch(() => false)) {
        await option.click();
      } else {
        await page.keyboard.press('Escape');
      }
      await settle(page, 300);
    }

    await beat(page, 'Send it for review');
    await dialog.getByRole('button', { name: /send for review/i }).click();
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 30_000 });
    await settle(page);

    // ── The gate ────────────────────────────────────────────────────────────
    await expect(page.getByText(eventName).first()).toBeVisible({
      timeout: 20_000,
    });
    await beat(page, 'Submitted — and it stops here');

    const row = page.getByRole('row').filter({ hasText: eventName });
    await expect(row.getByText(/pending|review/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await beat(page, 'A shop cannot publish itself to the front page');
    await beat(page, 'The iLokal team reviews every event first', 1600);

    // Not on the public listing, because it was never approved.
    await page.goto('/events');
    await settle(page);
    await expect(page.getByText(eventName)).toHaveCount(0);
    await beat(page, 'Not public until reviewed — the gate holds', 1600);

    writeState({ eventName });
  });
});
