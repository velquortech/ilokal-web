import { formatErrorForLog } from '@/lib/utils/describeDbError';
import { ImageResponse } from 'next/og';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { assertAuthorized } from '@/lib/utils/auth';
import { rateLimit } from '@/app/api/helpers/rateLimit';
import { createServerSupabaseClient } from '@/supabase/server';
import { resolveStorageUrl } from '@/app/api/helpers/storage';
import { loadPostFonts } from '@/lib/og/fonts';
import { fetchImageAsDataUrl, loadWordmarkDataUrl } from '@/lib/og/remoteImage';
import {
  clampScale,
  TEXT_SCALES,
  POST_RATIOS,
  WelcomePost,
  type PostCard,
  type PostRatio,
  type TextScaleKey,
  type TextScales,
} from '@/lib/og/welcomePost';

/**
 * GET /api/admin/welcome-post — renders the welcome square as a PNG.
 *
 * Admin-guarded. The businesses it draws are public, but an open endpoint that
 * renders an image per request is a free render farm, and this one decodes and
 * composites at 1080px per call.
 *
 * A GET returning an image so the admin page can preview it with a plain
 * `<img src>` and the browser handles re-fetching on a parameter change — a
 * POST returning a blob would need all of that by hand.
 */
export const runtime = 'nodejs';

/** A render is CPU-bound and fetches logos; a drag already debounces to ~3/s. */
const RATE_LIMIT = Number(process.env.WELCOME_POST_RATE_LIMIT ?? 60);
const RATE_WINDOW_MS = Number(
  process.env.WELCOME_POST_RATE_WINDOW_MS ?? 60_000,
);

/**
 * The response is derived from an admin's cookie session and must never sit in
 * a shared cache.
 *
 * ⚠️ `ImageResponse` defaults to `public, immutable, no-transform,
 * max-age=31536000` in production — verified in the bundled `@vercel/og`, not
 * assumed. That default is right for a public OG card and exactly wrong here:
 * it invites a CDN to serve one admin's render to anyone who asks, and it
 * freezes a preview for a year, so a re-uploaded logo would never show up.
 */
const NO_STORE = {
  'cache-control': 'private, no-store, max-age=0, must-revalidate',
} as const;

const querySchema = z.object({
  ids: z
    .string()
    .transform((value) =>
      // Deduped: `?ids=x,x` would otherwise pass `.max(2)` and render one shop
      // as both cards.
      Array.from(new Set(value.split(',').filter(Boolean))),
    )
    .pipe(z.array(z.guid()).min(1).max(2)),
  ratio: z.enum(['1x1', '4x5']).default('1x1'),
  /** Comma-separated ids whose name is suppressed (logo already says it). */
  hideName: z.string().optional(),
  /** One optional multiplier per text zone; each clamped before use. */
  nameScale: z.coerce.number().optional(),
  footerScale: z.coerce.number().optional(),
  download: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await assertAuthorized(request, { roles: ['admin'] });
    // The helper's own response carries the `ApiResponse` envelope and the
    // right status for each of unauthenticated / non-admin / inactive.
    if (!auth.authorized) return auth.error;

    const { allowed, retryAfterSec } = rateLimit(
      `welcome-post:${auth.user.id}`,
      RATE_LIMIT,
      RATE_WINDOW_MS,
    );
    if (!allowed) {
      return NextResponse.json(
        { message: 'Too many renders — try again in a moment.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
      );
    }

    const { searchParams } = request.nextUrl;
    const parsed = querySchema.safeParse({
      ids: searchParams.get('ids') ?? '',
      ratio: searchParams.get('ratio') ?? '1x1',
      hideName: searchParams.get('hideName') ?? undefined,
      nameScale: searchParams.get('nameScale') ?? undefined,
      footerScale: searchParams.get('footerScale') ?? undefined,
      download: searchParams.get('download') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Expected one or two business ids' },
        { status: 400 },
      );
    }

    const { ids, ratio, download } = parsed.data;
    const hidden = new Set(
      (parsed.data.hideName ?? '').split(',').filter(Boolean),
    );

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('businesses')
      .select('id, shop_name, logo_url')
      .in('id', ids)
      .is('archived_at', null);

    if (error) {
      console.error('[GET /api/admin/welcome-post]', formatErrorForLog(error));
      return NextResponse.json(
        { message: 'Could not load those shops' },
        { status: 500 },
      );
    }

    const rows = data ?? [];
    if (rows.length === 0) {
      return NextResponse.json({ message: 'No such shop' }, { status: 404 });
    }

    // Ordered by the caller's `ids`, not by whatever PostgREST returned, so the
    // left/right cards match what the admin picked and previewed.
    const byId = new Map(rows.map((row) => [row.id, row]));
    const ordered = ids
      .map((id) => byId.get(id))
      .filter((row): row is NonNullable<typeof row> => Boolean(row));

    // 🔴 Logos are fetched HERE, not by the renderer.
    //
    // `logo_url` is owner-writable free text and `resolveStorageUrl` passes an
    // absolute URL through untouched, so an unguarded fetch inside the render
    // is a request an attacker chooses. `fetchImageAsDataUrl` allowlists the
    // storage origin, bounds the time and the bytes, and answers `null` on any
    // failure — which the card layer already draws as initials.
    //
    // Doing it up front is also what makes a failure survivable at all:
    // `ImageResponse` renders lazily while streaming, so a throw inside it
    // escapes the `try/catch` below, after the headers have gone out.
    const [logos, wordmarkUrl] = await Promise.all([
      Promise.all(
        ordered.map((row) =>
          fetchImageAsDataUrl(
            resolveStorageUrl(supabase, 'shop-logos', row.logo_url),
          ),
        ),
      ),
      loadWordmarkDataUrl(),
    ]);

    const cards: PostCard[] = ordered.map((row, index) => ({
      name: row.shop_name,
      logoUrl: logos[index],
      showName: !hidden.has(row.id),
    }));

    // Read per zone rather than by string key, so renaming a `param` is a
    // compile error instead of a silently-ignored slider.
    const raw: Record<TextScaleKey, number | undefined> = {
      name: parsed.data.nameScale,
      footer: parsed.data.footerScale,
    };
    const scales = Object.fromEntries(
      (Object.keys(TEXT_SCALES) as TextScaleKey[]).map((key) => [
        key,
        clampScale(raw[key]),
      ]),
    ) as TextScales;

    const { width, height } = POST_RATIOS[ratio as PostRatio];
    const fonts = await loadPostFonts();

    const image = new ImageResponse(
      <WelcomePost
        cards={cards}
        ratio={ratio as PostRatio}
        wordmarkUrl={wordmarkUrl}
        scales={scales}
      />,
      { width, height, fonts },
    );

    // 🔴 The render is FORCED here, inside the try, and the buffer is served.
    //
    // Returning the `ImageResponse` directly streams it, and Satori renders
    // lazily as that stream is consumed — after the handler has returned and
    // the headers have gone out. So a render failure was not a 500 we could
    // log; it killed the function, and Vercel reported
    // `FUNCTION_INVOCATION_FAILED` with no application output whatsoever. That
    // is precisely how a WebP logo took this route down and left nothing to
    // debug from.
    //
    // Buffering costs one 1080px PNG in memory — one or two megabytes — and
    // gives up streaming, which is worth nothing for a single image the client
    // cannot use until it is complete. In exchange every failure from here on
    // is catchable, loggable and answerable.
    const png = await image.arrayBuffer();

    const headers: Record<string, string> = {
      ...NO_STORE,
      'Content-Type': 'image/png',
    };

    if (download) {
      // `slug` keeps a folder of these readable.
      const slug = cards
        .map((card) => card.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))
        .join('_')
        .replace(/^-|-$/g, '')
        .slice(0, 80);
      headers['Content-Disposition'] =
        `attachment; filename="ilokal-welcome-${slug || 'post'}-${ratio}.png"`;
    }

    return new NextResponse(png, { headers });
  } catch (error: unknown) {
    // Never the driver's or the renderer's text — a font or fetch failure
    // names paths.
    console.error(
      '[GET /api/admin/welcome-post] render failed',
      formatErrorForLog(error),
    );
    return NextResponse.json(
      { message: 'Could not render the post' },
      { status: 500 },
    );
  }
}
