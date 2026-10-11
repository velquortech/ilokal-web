import { test, expect } from '@playwright/test';
import { DEMO_BUSINESS } from '../fixtures/accounts';
import { beat, settle } from '../helpers/beat';

/**
 * ACT 2 · flow 1 — a customer finds shops, and finds the nearest ones.
 *
 * Deliberately runs ANONYMOUS. `/explore` is a public surface and its whole
 * job is to work for someone with no account; signing in first would skip past
 * the case that matters.
 *
 * Geolocation is pinned to Iloilo City Proper in `playwright.config.ts`.
 * Without an explicit position the page falls back to a default and distance
 * ordering stops being deterministic between runs.
 */

test.describe('Customer · discovery', () => {
  test('browses shops, searches, and finds the nearest ones', async ({
    page,
  }) => {
    await page.goto('/explore');
    await settle(page);
    await beat(page, 'A visitor with no account opens iLokal');

    // The dateline banner carries the pre-approved event from the preflight
    // seed — an event happening right now is promoted ahead of chronology.
    const banner = page.getByRole('region', { name: /what.s on/i });
    if (await banner.isVisible().catch(() => false)) {
      await beat(page, 'What’s on around Iloilo right now');
      await settle(page, 500);
    }

    await beat(page, 'Every shop on the platform');
    const cards = page.getByRole('link').filter({ hasText: /./ });
    expect(await cards.count()).toBeGreaterThan(0);

    // ── Search ──────────────────────────────────────────────────────────────
    await beat(page, 'Looking for something specific');
    const search = page.getByPlaceholder('Search shops…');
    // Derived from the shop's own name rather than a hardcoded word, so the
    // spec keeps working when DEMO_BUSINESS moves.
    await search.fill(DEMO_BUSINESS.name.split(' ')[1] ?? DEMO_BUSINESS.name);
    // The search is debounced and pushes to the URL; wait for the round trip.
    await page.waitForTimeout(1200);
    await settle(page);
    await expect(page.getByText(DEMO_BUSINESS.name).first()).toBeVisible({
      timeout: 20_000,
    });
    await beat(page, 'Found it');

    await search.fill('');
    await page.waitForTimeout(1200);
    await settle(page);

    // ── Category filter ─────────────────────────────────────────────────────
    const categoryFilter = page.getByLabel('Filter by category');
    if (await categoryFilter.isVisible().catch(() => false)) {
      await beat(page, 'Or browse by category');
      await categoryFilter.click();
      const option = page.getByRole('option').nth(1);
      if (await option.isVisible().catch(() => false)) {
        await option.click();
        await settle(page);
        await beat(page, 'Filtered');
      } else {
        await page.keyboard.press('Escape');
      }
    }

    // ── Nearest shops ───────────────────────────────────────────────────────
    await beat(page, 'But the real question — what’s near me?');
    await page.goto('/explore/nearby');
    await settle(page);

    // The page asks for the position on a button press rather than prompting
    // unsolicited, so the spec has to press it.
    const locateButton = page
      .getByRole('button', { name: /locat|near me|use my/i })
      .first();
    if (await locateButton.isVisible().catch(() => false)) {
      await beat(page, 'Share location');
      await locateButton.click();
      await settle(page, 1200);
    }

    await beat(page, 'Shops sorted by how far you’d actually walk');
    // Distances are the proof this is geolocated and not just a list.
    await expect(
      page.getByText(/\bkm\b|\bm away\b|\bmeters?\b/i).first(),
    ).toBeVisible({
      timeout: 25_000,
    });
    await settle(page, 800);

    // ── One shop, in detail ─────────────────────────────────────────────────
    await beat(page, 'Open one');
    await page.goto(`/explore/${DEMO_BUSINESS.id}`);
    await settle(page);
    await expect(page.getByText(DEMO_BUSINESS.name).first()).toBeVisible({
      timeout: 20_000,
    });
    await beat(
      page,
      `${DEMO_BUSINESS.name} — hours, contact, branches and the menu`,
      1600,
    );
  });
});
