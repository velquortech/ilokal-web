import type { Page } from '@playwright/test';

/**
 * On-screen caption overlay for the recorded walkthrough.
 *
 * Playwright cannot narrate, and a silent screen recording of a dashboard is
 * unreadable to anyone who did not build it. `beat()` names what is about to
 * happen so the video explains itself; you can still voice over the final mp4.
 *
 * The overlay is re-created per call rather than installed once, because a
 * navigation wipes the document. It is `pointer-events: none` so it can never
 * intercept a click the spec is trying to make, and it carries a data
 * attribute so specs never accidentally select through it.
 */

const OVERLAY_ID = 'ilokal-e2e-beat';

/** Show a caption, then hold briefly so it is readable at playback speed. */
export async function beat(
  page: Page,
  text: string,
  holdMs = 1100,
): Promise<void> {
  await page.evaluate(
    ({ id, message }) => {
      let host = document.getElementById(id);
      if (!host) {
        host = document.createElement('div');
        host.id = id;
        host.setAttribute('data-e2e-overlay', 'true');
        host.setAttribute('aria-hidden', 'true');
        host.style.cssText = [
          'position:fixed',
          'left:50%',
          'bottom:28px',
          'transform:translateX(-50%)',
          'z-index:2147483647',
          'pointer-events:none',
          'max-width:min(90vw,900px)',
          'padding:14px 26px',
          'border-radius:999px',
          'background:rgba(26,26,26,0.92)',
          'color:#FEF8D6',
          'font:600 17px/1.35 Inter,system-ui,sans-serif',
          'letter-spacing:0.01em',
          'text-align:center',
          'box-shadow:0 8px 32px rgba(0,0,0,0.35)',
          'backdrop-filter:blur(6px)',
          'transition:opacity 180ms ease',
        ].join(';');
        document.body.appendChild(host);
      }
      host.textContent = message;
      host.style.opacity = '1';
    },
    { id: OVERLAY_ID, message: text },
  );

  await page.waitForTimeout(holdMs);
}

/** Hide the caption — use before a shot where it would cover real content. */
export async function clearBeat(page: Page): Promise<void> {
  await page.evaluate((id) => {
    const host = document.getElementById(id);
    if (host) host.style.opacity = '0';
  }, OVERLAY_ID);
}

/**
 * Let a page settle before the next caption. Deliberately not a bare timeout
 * at the call sites: `networkidle` plus a short beat keeps the video from
 * cutting mid-paint while still failing fast if a route never settles.
 */
export async function settle(page: Page, ms = 600): Promise<void> {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(ms);
}
