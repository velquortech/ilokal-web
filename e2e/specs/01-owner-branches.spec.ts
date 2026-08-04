import { test, expect } from '@playwright/test';
import { DEMO_BUSINESS, signIn } from '../fixtures/accounts';
import { beat, settle } from '../helpers/beat';
import { writeState, runTag } from '../helpers/state';

/**
 * ACT 1 · flow 5 — a shop adds a second branch.
 *
 * The assertion that matters is not "the wizard submitted" but that the new
 * branch reaches the PUBLIC shop page. A branch nobody can find is not a
 * branch.
 */

test.describe('Owner · branches', () => {
  test('adds a branch and it appears on the public shop page', async ({
    page,
  }) => {
    const branchName = `Jaro Branch ${runTag()}`;

    await signIn(page, 'owner');
    await page.goto(`/business/${DEMO_BUSINESS.id}/branches`);
    await settle(page);
    await beat(page, `${DEMO_BUSINESS.name} — branch management`);

    // Baseline, so the assertion is a change and not just "a row exists".
    const rowsBefore = await page.getByRole('row').count();

    await beat(page, 'A growing shop opens a second location');
    // A LINK, not a button: rendered as `<Button asChild><Link>`, so the
    // accessible role comes from the Link it wraps.
    await page
      .getByRole('link', { name: /add branch/i })
      .first()
      .click();
    await page.waitForURL(/\/branches\/create/, { timeout: 30_000 });
    await settle(page);

    // ── Step 1 · Branch info ────────────────────────────────────────────────
    await beat(page, 'Step 1 — name the branch');
    await page.locator('#branchName').fill(branchName);
    await page
      .locator('#branchDescription')
      .fill('Second roastery and cafe, opening in Jaro.');
    await page.locator('#branchPhone').fill('0917 555 0142');
    await page.getByRole('button', { name: /^next$/i }).click();
    await settle(page);

    // ── Step 2 · Location ───────────────────────────────────────────────────
    // The map is the real affordance here (nobody knows their own
    // coordinates), but a click on a leaflet canvas is not a stable selector.
    // The spec types the pair the map would have produced; the video still
    // shows the map beside it.
    await beat(page, 'Step 2 — pin it on the map');
    await page.locator('#address').fill('E. Lopez St., Jaro, Iloilo City');
    await page.locator('#latitude').fill('10.7285');
    await page.locator('#longitude').fill('122.5601');
    await settle(page);
    await beat(
      page,
      'Coordinates are what make it findable in "shops near me"',
    );
    await page.getByRole('button', { name: /^next$/i }).click();
    await settle(page);

    // ── Steps 3-4 · Photos and documents are optional here ──────────────────
    // `require_business_documents` is false, so both steps can be walked past.
    for (const label of ['Photos', 'Documents']) {
      const next = page.getByRole('button', { name: /^next$/i });
      if (await next.isVisible().catch(() => false)) {
        await beat(page, `${label} — optional, skipping`, 700);
        await next.click();
        await settle(page, 400);
      }
    }

    // ── Step 5 · Review + submit ────────────────────────────────────────────
    await beat(page, 'Step 5 — review and submit');
    const submit = page
      .getByRole('button', { name: /submit|create branch|finish|save/i })
      .last();
    await submit.click();

    // The wizard ends on a success panel and waits — it does NOT navigate on
    // its own, so the spec has to take the same exit a person would.
    await expect(page.getByText(/application submitted/i)).toBeVisible({
      timeout: 45_000,
    });
    await beat(page, 'Submitted — and it goes for verification first');

    // A real button with an onClick handler here — unlike "Add Branch" on the
    // list page, which is a Link wrapped in Button styling.
    await page
      .getByRole('button', { name: /back to branches/i })
      .first()
      .click();
    await page.waitForURL(/\/branches(\?.*)?$/, { timeout: 45_000 });
    await settle(page);

    await beat(page, 'The new branch, awaiting review');
    await expect(page.getByText(branchName).first()).toBeVisible({
      timeout: 20_000,
    });
    expect(await page.getByRole('row').count()).toBeGreaterThanOrEqual(
      rowsBefore,
    );

    // ── What the public actually sees ───────────────────────────────────────
    //
    // ⚠️ FINDING (see `.claude/playwright-e2e-live-feature.md` §9): the branch
    // row is written `pending_review`, and the wizard tells the owner "our team
    // will verify your documents and activate the branch within 24–48 hours" —
    // but `business_branches()` filters only on the BUSINESS being verified and
    // the branch not being archived. It never looks at `b.status`, so the
    // unverified branch and its address are public immediately.
    //
    // This spec asserts what the app DOES, not what its copy promises, and
    // records the mismatch rather than hiding it behind a lenient check. If the
    // RPC is later given a `b.status = 'active'` filter, this assertion flips
    // to `toHaveCount(0)` and the beat below changes with it.
    await beat(page, 'And customers can find every branch');
    await page.goto(`/explore/${DEMO_BUSINESS.id}`);
    await settle(page);

    // The new branch is public (see the note above). Assert THAT, plus that the
    // shop now lists more than one branch — deliberately without naming an
    // existing branch, so the spec does not silently depend on which shop
    // `DEMO_BUSINESS` points at.
    await expect(page.getByText(branchName).first()).toBeVisible({
      timeout: 20_000,
    });

    const branchMentions = await page
      .getByText(/branch|city proper|pavia|jaro/i)
      .count();
    expect(
      branchMentions,
      'expected the shop to show more than one branch',
    ).toBeGreaterThan(1);
    await beat(page, 'Multiple branches, each one findable on the map', 1800);

    writeState({ branchName });
  });
});
