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

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/** Minimal HTML-entity escape for any value interpolated into the markup. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderMenuFollowUpEmail({
  shopName,
  ctaUrl,
  offeringNoun = 'menu',
  offeringPlural = 'listings',
  recipientName,
  appName = 'iLokal',
}: MenuFollowUpEmailInput): RenderedEmail {
  const safeShop = escapeHtml(shopName);
  const safeUrl = escapeHtml(ctaUrl);
  const safeNoun = escapeHtml(offeringNoun);
  const safePlural = escapeHtml(offeringPlural);
  const safeApp = escapeHtml(appName);
  const safeName = recipientName ? escapeHtml(recipientName) : 'there';

  // Title-cased per word for the heading and button ("…a Service Menu")
  // without mutating the prop. Escaped input, so this only touches letters.
  const nounTitle = safeNoun.replace(/\b\w/g, (character) =>
    character.toUpperCase(),
  );

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

  const html = `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(subject)}</title>
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<![endif]-->
<style>
  body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
  table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}
  img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none;}
  body{margin:0;padding:0;width:100%!important;background:#F3F4F6;}
  a{color:#A80004;}
  @media only screen and (max-width:600px){
    .container{width:100%!important;}
    .px{padding-left:22px!important;padding-right:22px!important;}
    .h1{font-size:26px!important;line-height:32px!important;}
  }
</style>

</head>
<body style="margin:0;padding:0;background:#F3F4F6;">
<span style="display:none!important;visibility:hidden;mso-hide:all;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${safeShop} is live on ${safeApp}, but its ${safeNoun} is still empty. Add a few ${safePlural} so shoppers know what you offer.&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌</span>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F3F4F6;">
<tbody><tr><td align="center" style="padding:24px 12px;">

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="container" style="width:600px;max-width:600px;background:#FFFFFF;border-radius:14px;overflow:hidden;border:1px solid #E5E7EB;">

    <!-- HEADER -->
    <tbody><tr><td class="px" style="padding:20px 32px;border-bottom:1px solid #E5E7EB;" bgcolor="#FFFFFF">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tbody><tr>
          <td align="left" style="font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:bold;color:#D70005;letter-spacing:-0.5px;">${safeApp}</td>
          <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;color:#A80004;">
            <span style="background:#FEF8D6;padding:6px 12px;border-radius:999px;display:inline-block;">📍 Made for Iloilo City</span>
          </td>
        </tr>
      </tbody></table>
    </td></tr>

    <!-- BODY -->
    <tr><td class="px" style="padding:44px 32px 8px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tbody><tr><td align="center" style="padding-bottom:22px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tbody><tr>
            <td width="64" height="64" align="center" valign="middle" bgcolor="#FEF8D6" style="border-radius:16px;font-size:30px;">📋</td>
          </tr></tbody></table>
        </td></tr>
        <tr><td align="center" class="h1" style="font-family:Arial,Helvetica,sans-serif;font-size:28px;line-height:34px;font-weight:bold;color:#1A1A1A;letter-spacing:-0.5px;padding-bottom:14px;">Your shop is live — now add a ${nounTitle}</td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#6B7280;padding-bottom:28px;">Hi ${safeName}, <strong style="color:#1A1A1A;">${safeShop}</strong> is verified and visible on ${safeApp} — but shoppers who open it see an empty ${safeNoun}. Add a few ${safePlural} so people know what you offer.</td></tr>
        <tr><td align="center" style="padding-bottom:24px;">
          <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeUrl}" style="height:50px;v-text-anchor:middle;width:220px;" arcsize="20%" strokecolor="#D70005" fillcolor="#D70005"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Add your ${nounTitle}</center></v:roundrect><![endif]-->
          <!--[if !mso]><!-- -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tbody><tr>
            <td bgcolor="#D70005" style="border-radius:10px;" align="center"><a href="${safeUrl}" target="_blank" style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#FFFFFF;text-decoration:none;padding:15px 40px;border-radius:10px;">Add your ${nounTitle}</a></td>
          </tr></tbody></table>
          <!--<![endif]-->
        </td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6B7280;padding-bottom:8px;">It takes a couple of minutes.</td></tr>
      </tbody></table>
    </td></tr>

    <!-- FALLBACK LINK -->
    <tr><td class="px" style="padding:24px 32px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#F9FAFB" style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;">
        <tbody><tr><td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:20px;color:#6B7280;">
          Button not working? Copy and paste this link into your browser:<br>
          <a href="${safeUrl}" target="_blank" style="color:#A80004;word-break:break-all;">${safeUrl}</a>
        </td></tr>
      </tbody></table>
    </td></tr>

    <!-- VALUE NOTE -->
    <tr><td class="px" style="padding:0 32px 36px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid #E5E7EB;">
        <tbody><tr><td style="padding-top:24px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:22px;color:#6B7280;">
          <strong style="color:#1A1A1A;">Why it matters:</strong> shops with a full ${safeNoun} get opened far more often — it is the first thing a shopper looks for after your name and photos.
        </td></tr>
      </tbody></table>
    </td></tr>

    <!-- FOOTER -->
    <tr><td class="px" style="padding:24px 32px 32px;border-top:1px solid #E5E7EB;" bgcolor="#FAFAFA">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tbody><tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;color:#D70005;">${safeApp}</td></tr>
        <tr><td align="center" style="padding-top:6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6B7280;">You're receiving this because you registered a shop on ${safeApp}.</td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:18px;color:#9CA3AF;padding-top:14px;">
          iLokal Inc. · Iznart Street, Iloilo City Proper, 5000 Iloilo, Philippines<br>
          Need help? <a href="https://ilokal.ph/support" target="_blank" style="color:#6B7280;text-decoration:underline;">Contact support</a><br>
          © 2026 ${safeApp} · Made in Iloilo City 🇵🇭
        </td></tr>
      </tbody></table>
    </td></tr>

  </tbody></table>

</td></tr>
</tbody></table>


</body></html>`;

  return { subject, html, text };
}
