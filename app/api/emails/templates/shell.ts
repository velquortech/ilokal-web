/**
 * The shared transactional-email shell (server-only).
 *
 * One copy of the table-based, inline-styled, Outlook-conditional HTML every
 * owner-facing email renders inside: Brick Ember header, Jasmine "Made for
 * Iloilo City" pill, 600px card, icon tile, heading, body, rounded CTA with an
 * mso `v:roundrect` fallback, copy-paste link box, a value note, and the
 * physical-address footer.
 *
 * Extracted when the registration follow-up would have been its THIRD copy.
 * Per the DRY rule in `CLAUDE.md`, a second implementation is not neutral — it
 * doubles the surface a bug hides in and the copies drift. A mail shell drifts
 * especially badly: the divergence is invisible until someone opens the odd one
 * out in Outlook.
 *
 * `resetPassword.ts` is deliberately NOT migrated onto this. Its layout carries
 * security-specific furniture (expiry warning, "didn't request this" block) and
 * it is the one email whose delivery is load-bearing for account recovery; the
 * shapes genuinely differ, so it keeps its own markup. Noted so the next reader
 * doesn't "finish the job" by forcing it through here.
 *
 * ## Escaping contract
 *
 * Fields ending in `Html` are TRUSTED, PRE-ESCAPED fragments — they may carry
 * markup (`<strong>`), so the caller escapes every value it interpolates, using
 * the `escapeHtml` exported here (one implementation, so the rules can't drift).
 * Every other field is a PLAIN string and is escaped by this module. Getting
 * that backwards is the only way to inject through here, hence the naming rule.
 */

/** Minimal HTML-entity escape for any value interpolated into email markup. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export interface EmailShellInput {
  /** Plain. Also rendered into <title>. */
  subject: string;
  /** Plain. The hidden preview line mail clients show beside the subject. */
  preheader: string;
  /** Plain. Brand name in the header, footer and the receiving-this line. */
  appName: string;
  /** Plain. Emoji shown in the tile above the heading. */
  icon: string;
  /** PRE-ESCAPED fragment — may contain markup. */
  headingHtml: string;
  /** PRE-ESCAPED fragment — the paragraph under the heading. */
  introHtml: string;
  /** Plain. Button label. */
  ctaLabel: string;
  /** Plain. Button destination; also rendered in the copy-paste box. */
  ctaUrl: string;
  /** Plain. Small line under the button. */
  ctaSubtext: string;
  /** PRE-ESCAPED fragment — the "Why it matters" note. */
  valueNoteHtml: string;
  /** Plain. Why this person is receiving the email. */
  footerReason: string;
}

export function renderEmailShell({
  subject,
  preheader,
  appName,
  icon,
  headingHtml,
  introHtml,
  ctaLabel,
  ctaUrl,
  ctaSubtext,
  valueNoteHtml,
  footerReason,
}: EmailShellInput): string {
  const safeSubject = escapeHtml(subject);
  const safePreheader = escapeHtml(preheader);
  const safeApp = escapeHtml(appName);
  const safeIcon = escapeHtml(icon);
  const safeLabel = escapeHtml(ctaLabel);
  const safeUrl = escapeHtml(ctaUrl);
  const safeSubtext = escapeHtml(ctaSubtext);
  const safeReason = escapeHtml(footerReason);

  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${safeSubject}</title>
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
<span style="display:none!important;visibility:hidden;mso-hide:all;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${safePreheader}&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌</span>

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
            <td width="64" height="64" align="center" valign="middle" bgcolor="#FEF8D6" style="border-radius:16px;font-size:30px;">${safeIcon}</td>
          </tr></tbody></table>
        </td></tr>
        <tr><td align="center" class="h1" style="font-family:Arial,Helvetica,sans-serif;font-size:28px;line-height:34px;font-weight:bold;color:#1A1A1A;letter-spacing:-0.5px;padding-bottom:14px;">${headingHtml}</td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#6B7280;padding-bottom:28px;">${introHtml}</td></tr>
        <tr><td align="center" style="padding-bottom:24px;">
          <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeUrl}" style="height:50px;v-text-anchor:middle;width:220px;" arcsize="20%" strokecolor="#D70005" fillcolor="#D70005"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">${safeLabel}</center></v:roundrect><![endif]-->
          <!--[if !mso]><!-- -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tbody><tr>
            <td bgcolor="#D70005" style="border-radius:10px;" align="center"><a href="${safeUrl}" target="_blank" style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#FFFFFF;text-decoration:none;padding:15px 40px;border-radius:10px;">${safeLabel}</a></td>
          </tr></tbody></table>
          <!--<![endif]-->
        </td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6B7280;padding-bottom:8px;">${safeSubtext}</td></tr>
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
          ${valueNoteHtml}
        </td></tr>
      </tbody></table>
    </td></tr>

    <!-- FOOTER -->
    <tr><td class="px" style="padding:24px 32px 32px;border-top:1px solid #E5E7EB;" bgcolor="#FAFAFA">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tbody><tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;color:#D70005;">${safeApp}</td></tr>
        <tr><td align="center" style="padding-top:6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6B7280;">${safeReason}</td></tr>
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
}
