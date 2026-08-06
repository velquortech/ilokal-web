/**
 * Dev-only email preview (design sandbox).
 *
 * GET /api/dev/email-preview?template=reset&name=Ian&url=...
 * GET /api/dev/email-preview?template=menu-followup&shop=The%20Artisan%20Roastery&noun=menu
 *   → renders the email template's HTML straight to the browser so the design
 *     can be iterated on with hot reload. Nothing is sent.
 *
 * Hard-gated to non-production: in production it 404s, so it never ships as a
 * live endpoint. Distinct from the log-link fallback, which tests the full flow.
 */

import { NextRequest, NextResponse } from 'next/server';
import { renderResetPasswordEmail } from '@/app/api/emails/templates/resetPassword';
import { renderMenuFollowUpEmail } from '@/app/api/emails/templates/menuFollowUp';

// Each entry maps a template key to a renderer that turns the request's
// searchParams into that template's props — one source of truth for both the
// dispatch and the "unknown template" list.
const TEMPLATES = {
  reset: (sp: URLSearchParams, origin: string) =>
    renderResetPasswordEmail({
      url:
        sp.get('url') ??
        `${origin}/reset-password?token_hash=SAMPLE_TOKEN&type=recovery`,
      recipientName: sp.get('name') ?? undefined,
    }).html,
  'menu-followup': (sp: URLSearchParams, origin: string) =>
    renderMenuFollowUpEmail({
      shopName: sp.get('shop') ?? 'The Artisan Roastery',
      ctaUrl: sp.get('url') ?? `${origin}/business/SAMPLE/product-catalogues`,
      offeringNoun: sp.get('noun') ?? undefined,
      offeringPlural: sp.get('plural') ?? undefined,
      recipientName: sp.get('name') ?? undefined,
    }).html,
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

  const html = TEMPLATES[key](searchParams, origin);

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
