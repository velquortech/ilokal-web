/**
 * IMG15 — a deal photo with no reader is a column that lies.
 *
 * `coupons.image_url` is only worth having if the whole chain carries it:
 * the RPC projects it, the mobile route resolves it to a URL, and the dashboard
 * can change it afterwards. Miss any one and an owner uploads a picture that is
 * never shown, with nothing failing anywhere.
 *
 * Source-level, because the pieces span SQL, a route and two dialogs — there is
 * no single runtime seam that would catch a missing link.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

const MIGRATION = 'supabase/migrations/20260807120000_coupon_image.sql';
const DEALS_ROUTE = 'app/api/mobile/deals/route.ts';
const COUPON_SERVICE = 'lib/api/coupons/couponService.ts';
const ADD_COUPON =
  'app/business/[businessId]/coupons/components/add-coupon.tsx';
const UPDATE_COUPON =
  'app/business/[businessId]/coupons/components/update-coupon.tsx';
// The picker and the photo wiring moved into the shared template-first dialog
// (Phase 1) — the chain to assert is the same, one level down.
const PROMO_FORM_DIALOG =
  'app/business/[businessId]/coupons/components/promo-form-dialog.tsx';
const PROMO_TEMPLATES =
  'app/business/[businessId]/coupons/components/promo-templates.ts';

describe('the column exists and the RPC projects it', () => {
  const sql = read(MIGRATION);

  it('adds the column additively', () => {
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS image_url TEXT/i);
  });

  it('projects it through mobile_deals in the same migration', () => {
    // Adding the column without this would store a photo nothing reads.
    expect(sql).toMatch(/c\.image_url\s+AS deal_image_url/);
    expect(sql).toMatch(/'deal_image_url',\s+deal_image_url/);
  });

  it('replaces the function rather than dropping it', () => {
    // A DROP takes the EXECUTE grants and the owner with it, and this function
    // is SECURITY DEFINER and anon-callable — it would go silently unreachable
    // for every anonymous visitor.
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.mobile_deals/);
    expect(sql).not.toMatch(/DROP FUNCTION[^;]*mobile_deals/i);
  });

  it('keeps the function SECURITY DEFINER with a pinned search_path', () => {
    expect(sql).toMatch(/SECURITY DEFINER/);
    expect(sql).toMatch(/SET search_path/);
  });
});

describe('the mobile route resolves it', () => {
  const route = read(DEALS_ROUTE);

  it('turns the stored path into a URL from the right bucket', () => {
    // The RPC returns raw paths; without this the client gets a bucket path it
    // cannot render.
    expect(route).toMatch(
      /deal_image_url: resolveStorageUrl\(\s*supabase,\s*'product-images',/,
    );
  });

  it('keeps the business fallbacks alongside it', () => {
    // Additive: old clients ignore the new key and keep drawing the card
    // exactly as before. Repurposing either of these would be a breaking
    // mobile change.
    expect(route).toMatch(/business_logo_url: resolveStorageUrl\(/);
    expect(route).toMatch(/business_image_url: resolveStorageUrl\(/);
  });
});

describe('IMG17 — it stays editable after registration', () => {
  it('is written on create and updatable', () => {
    const service = read(COUPON_SERVICE);
    expect(service).toMatch(/image_url: input\.image_url \?\? null/);
    // `undefined` means "not sent", null means "remove the photo" — collapsing
    // them would make clearing an image impossible.
    expect(service).toMatch(
      /if \(input\.image_url !== undefined\) updateData\.image_url = input\.image_url/,
    );
  });

  it('the shared dialog offers the picker through the shared field', () => {
    const source = read(PROMO_FORM_DIALOG);
    // The shared field is what runs compressImage — a phone photo is 3-6 MB
    // against a 2 MB cap, so a bespoke picker would reject the pictures this
    // exists to accept.
    expect(source).toMatch(/<ImageUploadField/);
    expect(source).not.toMatch(/createImageBitmap|toBlob\(/);
  });

  it('create writes the uploaded image via the shared request builder', () => {
    // The `?? null` lives in the builder: no upload → explicit null on create
    // (the row is new, there is no existing photo to preserve).
    expect(read(PROMO_TEMPLATES)).toMatch(
      /image_url: opts\.imageUrl \?\? null/,
    );
    expect(read(ADD_COUPON)).toMatch(/buildPromoRequest/);
  });

  it('edit preserves the photo unless a new one was picked', () => {
    // The service treats `undefined` as "not sent" and null as "remove the
    // photo" — sending null on every save used to wipe a deal's image the
    // moment an owner edited anything else.
    expect(read(UPDATE_COUPON)).toMatch(
      /if \(!\(image instanceof File\)\) delete request\.image_url/,
    );
  });

  it('shows the existing photo when editing', () => {
    // Without a defaultValue the owner sees an empty picker and cannot tell
    // whether the deal already has a photo.
    expect(read(PROMO_FORM_DIALOG)).toMatch(
      /defaultValue=\{initial\?\.image_url \?\? null\}/,
    );
  });
});
