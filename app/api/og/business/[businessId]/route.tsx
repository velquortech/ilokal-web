import { ImageResponse } from 'next/og';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { resolveStorageUrl } from '@/app/api/helpers/storage';
import { loadPostFonts } from '@/lib/og/fonts';
import { fetchImageAsDataUrl, loadWordmarkDataUrl } from '@/lib/og/remoteImage';
import { BusinessShareCard, OG_LANDSCAPE } from '@/lib/og/businessShareCard';
import { createServerSupabaseClient } from '@/supabase/server';

/**
 * GET /api/og/business/:businessId — the branded 1200×630 share card as PNG.
 *
 * This is the `og:image` of `/s/[businessId]` (the page every shared business
 * link lands on), so it is PUBLIC by design: crawlers have no session, and
 * Messenger/Facebook fetch it from their own servers.
 *
 * A public endpoint that renders an image per request is a render farm, so the
 * defense is the cache: the response is `public` with a 5-minute revalidate so
 * a changed logo/name shows up without letting a CDN pin it for a year (the
 * `ImageResponse` production default), and each business id renders rarely.
 *
 * The welcome-post lessons carry over verbatim: the logo is fetched BEFORE the
 * render through `fetchImageAsDataUrl` (origin allowlist + timeout + byte cap
 * + WebP→PNG transcode — the renderer dies on WebP, which is every logo the
 * app stores), and the render is forced to a buffer inside the try so a
 * failure is a catchable 500 rather than a streamed-then-dead invocation.
 */
export const runtime = 'nodejs';

/** Revalidate on the same cadence as the share endpoint itself. */
const CACHE = {
  'cache-control':
    'public, max-age=300, s-maxage=300, stale-while-revalidate=3600',
} as const;

const paramsSchema = z.object({ businessId: z.guid() });

type Params = { params: Promise<{ businessId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { businessId } = await params;
    const parsed = paramsSchema.safeParse({ businessId });
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid business id' },
        { status: 400 },
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('businesses')
      .select('id, shop_name, logo_url')
      .eq('id', businessId)
      .eq('status', 'verified')
      .is('archived_at', null)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { message: 'Business not found' },
        { status: 404 },
      );
    }

    const [logoUrl, wordmarkUrl] = await Promise.all([
      fetchImageAsDataUrl(
        resolveStorageUrl(supabase, 'shop-logos', data.logo_url),
      ),
      loadWordmarkDataUrl(),
    ]);

    const fonts = await loadPostFonts();

    const image = new ImageResponse(
      <BusinessShareCard
        name={data.shop_name}
        logoUrl={logoUrl}
        wordmarkUrl={wordmarkUrl}
      />,
      { ...OG_LANDSCAPE, fonts },
    );

    // Forced here, inside the try — see the welcome-post route for why
    // streaming the ImageResponse lets a render failure escape the handler.
    const png = await image.arrayBuffer();

    return new NextResponse(png, {
      headers: { ...CACHE, 'Content-Type': 'image/png' },
    });
  } catch (error: unknown) {
    console.error('[GET /api/og/business/:businessId] render failed', error);
    return NextResponse.json(
      { message: 'Could not render the card' },
      { status: 500 },
    );
  }
}
