/**
 * Reset-password email template (server-only).
 *
 * Pure renderer: takes the reset URL and returns the subject + HTML + plain-text
 * bodies. No sending, no I/O — see `../sendResetEmail.ts` for delivery. The HTML
 * is a table-based, inline-styled email (Outlook/mso conditionals included) so
 * it renders across mail clients.
 */

export interface ResetPasswordEmailInput {
  /** The one-time reset link the CTA points to. */
  url: string;
  /** Display name for the product (defaults to "iLokal"). */
  appName?: string;
  /** Optional recipient name for a friendlier greeting. */
  recipientName?: string;
  /** How long the link stays valid, for the copy (defaults to "1 hour"). */
  expiresInLabel?: string;
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

export function renderResetPasswordEmail({
  url,
  appName = 'iLokal',
  recipientName,
  expiresInLabel = '1 hour',
}: ResetPasswordEmailInput): RenderedEmail {
  const safeUrl = escapeHtml(url);
  const safeApp = escapeHtml(appName);
  const safeExpiry = escapeHtml(expiresInLabel);
  const safeName = recipientName ? escapeHtml(recipientName) : 'there';

  const subject = `Reset your ${appName} password`;

  const text = [
    `Hi ${recipientName ?? 'there'},`,
    '',
    `We got a request to reset the password for your ${appName} account.`,
    'Open the link below to choose a new one:',
    '',
    url,
    '',
    `This link expires in ${expiresInLabel}.`,
    '',
    "Didn't request this? You can safely ignore this email — your password",
    "won't change until you create a new one. Never share this link.",
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
  a{color:#15803D;}
  @media only screen and (max-width:600px){
    .container{width:100%!important;}
    .px{padding-left:22px!important;padding-right:22px!important;}
    .h1{font-size:26px!important;line-height:32px!important;}
    .code{font-size:30px!important;letter-spacing:8px!important;}
  }
</style>

</head>
<body style="margin:0;padding:0;background:#F3F4F6;">
<span style="display:none!important;visibility:hidden;mso-hide:all;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Reset your ${safeApp} password — this link expires in ${safeExpiry}. If you didn't request it, you can safely ignore this email.&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌</span>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F3F4F6;">
<tbody><tr><td align="center" style="padding:24px 12px;">

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="container" style="width:600px;max-width:600px;background:#FFFFFF;border-radius:14px;overflow:hidden;border:1px solid #E5E7EB;">

    <!-- HEADER -->
    <tbody><tr><td class="px" style="padding:20px 32px;border-bottom:1px solid #E5E7EB;" bgcolor="#FFFFFF">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tbody><tr>
          <td align="left" style="font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:bold;color:#65A30D;letter-spacing:-0.5px;">${safeApp}</td>
          <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;color:#15803D;">
            <span style="background:#ECFCCB;padding:6px 12px;border-radius:999px;display:inline-block;">📍 Made for Iloilo City</span>
          </td>
        </tr>
      </tbody></table>
    </td></tr>

    <!-- BODY -->
    <tr><td class="px" style="padding:44px 32px 8px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tbody><tr><td align="center" style="padding-bottom:22px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tbody><tr>
            <td width="64" height="64" align="center" valign="middle" bgcolor="#F0FDF4" style="border-radius:16px;font-size:30px;">🔒</td>
          </tr></tbody></table>
        </td></tr>
        <tr><td align="center" class="h1" style="font-family:Arial,Helvetica,sans-serif;font-size:28px;line-height:34px;font-weight:bold;color:#1A1A1A;letter-spacing:-0.5px;padding-bottom:14px;">Reset your password</td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#6B7280;padding-bottom:28px;">Hi ${safeName}, we got a request to reset the password for your ${safeApp} account. Tap the button below to choose a new one.</td></tr>
        <tr><td align="center" style="padding-bottom:24px;">
          <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeUrl}" style="height:50px;v-text-anchor:middle;width:220px;" arcsize="20%" strokecolor="#65A30D" fillcolor="#65A30D"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Reset Password</center></v:roundrect><![endif]-->
          <!--[if !mso]><!-- -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tbody><tr>
            <td bgcolor="#65A30D" style="border-radius:10px;" align="center"><a href="${safeUrl}" target="_blank" style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#FFFFFF;text-decoration:none;padding:15px 40px;border-radius:10px;">Reset Password</a></td>
          </tr></tbody></table>
          <!--<![endif]-->
        </td></tr>
        <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6B7280;padding-bottom:8px;">This link expires in <strong style="color:#1A1A1A;">${safeExpiry}</strong>.</td></tr>
      </tbody></table>
    </td></tr>

    <!-- FALLBACK LINK -->
    <tr><td class="px" style="padding:24px 32px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#F9FAFB" style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;">
        <tbody><tr><td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:20px;color:#6B7280;">
          Button not working? Copy and paste this link into your browser:<br>
          <a href="${safeUrl}" target="_blank" style="color:#15803D;word-break:break-all;">${safeUrl}</a>
        </td></tr>
      </tbody></table>
    </td></tr>

    <!-- SECURITY NOTE -->
    <tr><td class="px" style="padding:0 32px 36px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid #E5E7EB;">
        <tbody><tr><td style="padding-top:24px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:22px;color:#6B7280;">
          <strong style="color:#1A1A1A;">Didn't request this?</strong> You can safely ignore this email — your password won't change until you create a new one. For your security, never share this link with anyone.
        </td></tr>
      </tbody></table>
    </td></tr>

    <!-- FOOTER -->
    <tr><td class="px" style="padding:24px 32px 32px;border-top:1px solid #E5E7EB;" bgcolor="#FAFAFA">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tbody><tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;color:#65A30D;">${safeApp}</td></tr>
        <tr><td align="center" style="padding-top:6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6B7280;">This is an automated security message from ${safeApp}.</td></tr>
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
