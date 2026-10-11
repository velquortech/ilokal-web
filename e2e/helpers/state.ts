import fs from 'fs';
import path from 'path';

/**
 * Tiny hand-off between specs.
 *
 * The acts form a chain — the owner publishes a coupon in Act 1 and the
 * customer redeems THAT coupon in Act 2 — and Playwright gives separate specs
 * no shared memory. A file is the least clever thing that works, and it keeps
 * each spec readable on its own.
 *
 * Every reader falls back gracefully: a spec run in isolation must still pass,
 * so `readState` returning `{}` is a supported case, not an error.
 */

const STATE_FILE = path.join(__dirname, '..', '.artifacts', 'state.json');

export interface E2EState {
  /** Coupon code published in 02-owner-promotions, redeemed in 05. */
  couponCode?: string;
  /** Public description of the coupon from 02 — the card shows this, not the code. */
  couponBlurb?: string;
  /** Deal code published in 02, asserted visible on /explore/deals. */
  dealCode?: string;
  /** Branch name created in 01, asserted on the public shop page. */
  branchName?: string;
  /** Event name proposed in 03 — stays pending_review by design. */
  eventName?: string;
}

export function readState(): E2EState {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) as E2EState;
  } catch {
    return {};
  }
}

export function writeState(patch: Partial<E2EState>): void {
  const next = { ...readState(), ...patch };
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(next, null, 2));
}

/**
 * A run-unique suffix. Coupon codes and branch names must not collide with a
 * previous run's rows — the suite writes to a persistent local DB, it does not
 * reset it.
 */
export function runTag(): string {
  return `${Date.now().toString(36).slice(-5).toUpperCase()}`;
}
