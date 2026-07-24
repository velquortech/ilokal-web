/**
 * Dev-only email preview (design sandbox).
 *
 * GET /api/dev/email-preview?template=reset&name=Ian&url=...
 *   → renders the email template's HTML straight to the browser so the design
 *     can be iterated on with hot reload. Nothing is sent.
 *
 * Hard-gated to non-production: in production it 404s, so it never ships as a
 * live endpoint. Distinct from the log-link fallback, which tests the full flow.
 */

import { NextRequest, NextResponse } from 'next/server';
import { renderResetPasswordEmail } from '@/app/api/emails/templates/resetPassword';

const TEMPLATES = {
  reset: renderResetPasswordEmail,
} as const;

type TemplateKey = keyof typeof TEMPLATES;

export function GET(request: NextRequest): NextResponse {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not found', { status: 404 });
  }

  const { searchParams, origin } = new URL(request.url);
  const key = (searchParams.get('template') ?? 'reset') as TemplateKey;

  if (!(key in TEMPLATES)) {
    return new NextResponse(
      `Unknown template "${key}". Available: ${Object.keys(TEMPLATES).join(', ')}`,
      { status: 400 },
    );
  }

  // Sample link for design preview only — derive the base from the request
  // origin so it matches whatever host/port dev is on (no hardcode, no env).
  const sampleUrl =
    searchParams.get('url') ??
    `${origin}/reset-password?token_hash=SAMPLE_TOKEN&type=recovery`;
  const recipientName = searchParams.get('name') ?? undefined;

  const { html } = renderResetPasswordEmail({
    url: sampleUrl,
    recipientName,
  });

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
