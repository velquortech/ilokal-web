import { ImageResponse } from 'next/og';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { assertAuthorized } from '@/lib/utils/auth';
import { createServerSupabaseClient } from '@/supabase/server';
import { resolveStorageUrl } from '@/app/api/helpers/storage';
import { loadPostFonts } from '@/lib/og/fonts';
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
 * renders an image per request is a free render farm, and this one fetches
 * remote logos on every call.
 *
 * A GET returning an image so the admin page can preview it with a plain
 * `<img src>` and the browser handles caching and re-fetching on a parameter
 * change — a POST returning a blob would need all of that by hand.
 */
export const runtime = 'nodejs';

const querySchema = z.object({
  ids: z
    .string()
    .transform((value) => value.split(',').filter(Boolean))
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
    if (!auth.authorized) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
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
      console.error('[GET /api/admin/welcome-post]', error);
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
    const cards: PostCard[] = ids
      .map((id) => byId.get(id))
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .map((row) => ({
        name: row.shop_name,
        // Satori fetches this; a bucket-relative path would 404 mid-render.
        logoUrl: resolveStorageUrl(supabase, 'shop-logos', row.logo_url),
        showName: !hidden.has(row.id),
      }));

    // Built from the zone record, so adding a zone does not mean remembering
    // to read another parameter here.
    const scales = Object.fromEntries(
      (Object.keys(TEXT_SCALES) as TextScaleKey[]).map((key) => [
        key,
        clampScale(
          (parsed.data as unknown as Record<string, unknown>)[
            TEXT_SCALES[key].param
          ] as number,
        ),
      ]),
    ) as TextScales;

    const { width, height } = POST_RATIOS[ratio as PostRatio];
    const fonts = await loadPostFonts();

    // The wordmark is a drawn asset and must never be typeset as text. Its URL
    // is app-owned rather than request-derived — the reset-link lesson: a
    // Host header is attacker-controlled.
    const origin =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ??
      request.nextUrl.origin;
    const wordmarkUrl = `${origin}/brand/wordmark/ilokal-wordmark-jasmine.png`;

    const image = new ImageResponse(
      <WelcomePost
        cards={cards}
        ratio={ratio as PostRatio}
        wordmarkUrl={wordmarkUrl}
        scales={scales}
      />,
      { width, height, fonts },
    );

    if (!download) return image;

    // Same render, offered as a file. `slug` keeps a folder of these readable.
    const slug = cards
      .map((card) => card.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))
      .join('_')
      .replace(/^-|-$/g, '')
      .slice(0, 80);

    return new NextResponse(await image.arrayBuffer(), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="ilokal-welcome-${slug || 'post'}-${ratio}.png"`,
      },
    });
  } catch (error: unknown) {
    // Never the driver's or the renderer's text — a font or fetch failure
    // names paths.
    console.error('[GET /api/admin/welcome-post] render failed', error);
    return NextResponse.json(
      { message: 'Could not render the post' },
      { status: 500 },
    );
  }
}
