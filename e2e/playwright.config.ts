import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Playwright config — LOCAL DEVELOPMENT ONLY.
 *
 * This suite drives a real browser against a real Supabase stack and WRITES
 * REAL ROWS (branches, coupons, redemptions, follows, events). Pointed at a
 * cloud project it would pollute production data, so `global-setup.ts` refuses
 * to run unless both the app and the Supabase URL are localhost. That guard is
 * a safety control, not a convenience — do not weaken it.
 *
 * Specs are `*.spec.ts`, never `*.test.ts`: vitest's `include` globs every
 * `.test.ts` in the repo with no directory scoping, so a `.test.ts` here would
 * be swept into `yarn test:run`, loaded under `environment: 'node'`, and break
 * the unit suite.
 */

/** Frames per action. Untouched Playwright speed is unwatchable on video. */
const SLOW_MO = Number(process.env.E2E_SLOW_MO ?? 350);

export default defineConfig({
  testDir: path.join(__dirname, 'specs'),
  testMatch: '**/*.spec.ts',
  globalSetup: path.join(__dirname, 'global-setup.ts'),
  outputDir: path.join(__dirname, '.artifacts', 'test-results'),

  /**
   * Sequential, single worker. Two reasons, both real:
   *  - The flows form a chain (owner publishes a coupon -> customer redeems it
   *    -> owner's analytics move). Parallel workers would race that chain.
   *  - Redeem/follow are rate-limited per user (30/60s) and auth per IP
   *    (30/60s). Parallel logins trip the limiter and 429.
   */
  workers: 1,
  fullyParallel: false,

  /**
   * No retries. A retry re-runs writes that already landed (a second redeem of
   * the same coupon is refused by design), so a retry would report a failure
   * the app is correct to produce.
   */
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },

  reporter: [
    ['list'],
    [
      'html',
      {
        outputFolder: path.join(__dirname, '.artifacts', 'report'),
        open: 'never',
      },
    ],
  ],

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    video: { mode: 'on', size: { width: 1280, height: 720 } },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    viewport: { width: 1280, height: 720 },
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
    launchOptions: { slowMo: SLOW_MO },

    /**
     * Iloilo City Proper. `/explore/nearby` is geolocated; without an explicit
     * position the page falls back to a default and distances stop being
     * deterministic between runs.
     */
    geolocation: { latitude: 10.6973, longitude: 122.5649 },
    permissions: ['geolocation'],
    locale: 'en-PH',
    timezoneId: 'Asia/Manila',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
