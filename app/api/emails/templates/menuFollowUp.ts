/**
 * Menu follow-up email template (server-only).
 *
 * Pure renderer: takes the shop, the owner and the CTA link and returns the
 * subject + HTML + plain-text bodies. No sending, no I/O — delivery lives in a
 * sender module (see `../sendResetEmail.ts` for the shape). The HTML is a
 * table-based, inline-styled email (Outlook/mso conditionals included) so it
 * renders across mail clients.
 *
 * Design is deliberately the same shell as the reset-password email — Brick
 * Ember header, Jasmine "Made for Iloilo City" pill, 600px card, rounded CTA,
 * physical-address footer — so the two read as one brand. The CONTENT is this
 * feature's: an owner whose verified shop still has no offerings, nudged to add
 * some.
 *
 * The offering NOUN varies by vertical (`business_types.offering_profile`): a
 * café's is "Menu", a retail shop's "Product Catalogue", a salon's "Service
 * Menu". Telling a salon to "add your menu" is the exact mismatch the dashboard
 * vocabulary already avoids, so the noun is a prop, not a hardcode. It falls
 * back to a neutral "listings" when no profile resolves.
 */

import { escapeHtml, renderEmailShell, type RenderedEmail } from './shell';

export interface MenuFollowUpEmailInput {
  /** The shop being nudged — appears in the subject, heading and body. */
  shopName: string;
  /** Where "Add your …" points: the owner's own catalogue page. App-owned. */
  ctaUrl: string;
  /**
   * The shop's own word for its catalogue, singular, e.g. "menu",
   * "service menu", "product catalogue". Defaults to "menu".
   */
  offeringNoun?: string;
  /**
   * Plural form used in the "add a few …" line, e.g. "menu items", "services".
   * Defaults to "listings", the vertical-neutral catch-all.
   */
  offeringPlural?: string;
  /** Optional owner name for a friendlier greeting. */
  recipientName?: string;
  /** Display name for the product (defaults to "iLokal"). */
  appName?: string;
}

export type { RenderedEmail } from './shell';

export function renderMenuFollowUpEmail({
  shopName,
  ctaUrl,
  offeringNoun = 'menu',
  offeringPlural = 'listings',
  recipientName,
  appName = 'iLokal',
}: MenuFollowUpEmailInput): RenderedEmail {
  const safeShop = escapeHtml(shopName);
  const safeNoun = escapeHtml(offeringNoun);
  const safePlural = escapeHtml(offeringPlural);
  const safeApp = escapeHtml(appName);
  const safeName = recipientName ? escapeHtml(recipientName) : 'there';

  // Title-cased per word for the heading and button ("…a Service Menu").
  // Cased BEFORE escaping, not after: `\b\w` on an already-escaped string
  // would upper-case the first letter of an entity (`&amp;` → `&Amp;`) and
  // render it literally. Escape the cased result.
  const nounTitleRaw = offeringNoun.replace(/\b\w/g, (character) =>
    character.toUpperCase(),
  );
  const nounTitle = escapeHtml(nounTitleRaw);

  const subject = `Add your ${offeringNoun} on ${appName}`;

  const text = [
    `Hi ${recipientName ?? 'there'},`,
    '',
    `${shopName} is verified and live on ${appName} — but shoppers who open`,
    `your shop right now see an empty ${offeringNoun}.`,
    '',
    `Add a few ${offeringPlural} so people know what you offer. It takes a`,
    'couple of minutes:',
    '',
    ctaUrl,
    '',
    `Shops with a full ${offeringNoun} get opened far more often.`,
    '',
    `— ${appName} · Made in Iloilo City`,
  ].join('\n');

  const html = renderEmailShell({
    subject,
    // Plain — the shell escapes it. Passing the pre-escaped copy would
    // double-escape a shop name containing an ampersand.
    preheader: `${shopName} is live on ${appName}, but its ${offeringNoun} is still empty. Add a few ${offeringPlural} so shoppers know what you offer.`,
    appName,
    icon: '📋',
    headingHtml: `Your shop is live — now add a ${nounTitle}`,
    introHtml: `Hi ${safeName}, <strong style="color:#1A1A1A;">${safeShop}</strong> is verified and visible on ${safeApp} — but shoppers who open it see an empty ${safeNoun}. Add a few ${safePlural} so people know what you offer.`,
    ctaLabel: `Add your ${nounTitleRaw}`,
    ctaUrl,
    ctaSubtext: 'It takes a couple of minutes.',
    valueNoteHtml: `<strong style="color:#1A1A1A;">Why it matters:</strong> shops with a full ${safeNoun} get opened far more often — it is the first thing a shopper looks for after your name and photos.`,
    footerReason: `You're receiving this because you registered a shop on ${appName}.`,
  });

  return { subject, html, text };
}
