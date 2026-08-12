/**
 * The branded OG card for shared business links (`/s/[businessId]`).
 *
 * Rendered server-side by Satori into a 1200×630 PNG — the image Messenger,
 * Facebook and X show beside a shared shop link — so a bare logo is replaced
 * with the Brick Ember lockup. Shares the welcome-post family: the same
 * backdrop circles, the Pally display face, and the jasmine wordmark asset.
 */
import {
  POST_FONT_FAMILY,
  Backdrop,
  displayName,
  initials,
} from './welcomePost';

/** The landscape card crawlers expect (twitter `summary_large_image`). */
export const OG_LANDSCAPE = { width: 1200, height: 630 } as const;

/** Brand palette, from DESIGN.md. Raw hex because this is not a themed surface. */
const BRICK = '#D70005';
const JASMINE = '#FEE87B';
const CORNSILK = '#FEF8D6';
const CHARCOAL = '#1A1A1A';
const WHITE = '#FFFFFF';

const NAME_LINE_HEIGHT = 1.08;
const NAME_MAX_LINES = 2;

/**
 * Font size for the shop name, keyed on its length.
 *
 * The live names run 3 to 29 characters — `LU2` against
 * `Suds & Sips Carwash and Café`. One size cannot serve a ten-times spread, so
 * the same length ladder the welcome post uses, tuned for the 1200px canvas.
 */
export function shareNameFontSize(name: string): number {
  const length = displayName(name).length;
  return length <= 8 ? 76 : length <= 14 ? 64 : length <= 20 ? 56 : 50;
}

export interface BusinessShareCardProps {
  name: string;
  /**
   * A `data:image/png` URL, or null for the initials card.
   *
   * PNG specifically — the renderer cannot parse WebP, which is every logo the
   * app stores, and the fetch happens in `lib/og/remoteImage.ts` before the
   * render starts (origin allowlist, timeout, byte cap).
   */
  logoUrl: string | null;
  /**
   * The jasmine wordmark as a `data:` URL, or null when unreadable.
   *
   * Absent rather than broken: the wordmark is drawn lettering and must never
   * be typeset as text, so there is no fallback to substitute.
   */
  wordmarkUrl: string | null;
}

export function BusinessShareCard({
  name,
  logoUrl,
  wordmarkUrl,
}: BusinessShareCardProps) {
  const { width, height } = OG_LANDSCAPE;
  const fontSize = shareNameFontSize(name);
  // Fixed to exactly two lines: a third would push past the card, and Satori
  // has no reliable line-clamp to fall back on.
  const nameBoxHeight = Math.round(
    fontSize * NAME_LINE_HEIGHT * NAME_MAX_LINES,
  );
  const LOGO_CARD = 216;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        width,
        height,
        backgroundColor: BRICK,
        paddingTop: 44,
        paddingBottom: 36,
        fontFamily: POST_FONT_FAMILY,
      }}
    >
      <Backdrop width={width} height={height} />

      {/* The wordmark is drawn lettering — never the literal text "iLokal".
          Raw <img> for the same reason as the logo: Satori renders this, not
          the browser. */}
      {wordmarkUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={wordmarkUrl} width={300} alt="iLokal" />
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* A white card around the logo, like the app's avatar discs — the
            logo is not a photograph, so `contain` rather than `cover`. */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: LOGO_CARD,
            height: LOGO_CARD,
            borderRadius: 24,
            backgroundColor: WHITE,
          }}
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              width={Math.round(LOGO_CARD * 0.83)}
              height={Math.round(LOGO_CARD * 0.83)}
              style={{ objectFit: 'contain' }}
              alt=""
            />
          ) : (
            // A single unreachable logo must cost the card its picture, not
            // the whole render — initials on Cornsilk, as in the welcome post.
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: LOGO_CARD,
                height: LOGO_CARD,
                borderRadius: 24,
                backgroundColor: CORNSILK,
                color: CHARCOAL,
                fontWeight: 700,
                fontSize: Math.round(LOGO_CARD * 0.4),
                opacity: 0.85,
              }}
            >
              {initials(name)}
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 880,
            height: nameBoxHeight,
            overflow: 'hidden',
            marginTop: 26,
            color: WHITE,
            fontWeight: 700,
            fontSize,
            lineHeight: NAME_LINE_HEIGHT,
            textAlign: 'center',
          }}
        >
          {displayName(name)}
        </div>
      </div>

      {/* Same eyebrow language as the welcome post's "NEW ON ILOKAL" — the
          landing page footer's promise, so card and page agree. */}
      <div
        style={{
          display: 'flex',
          color: JASMINE,
          fontWeight: 700,
          fontSize: 21,
          letterSpacing: 2.5,
        }}
      >
        DISCOVER LOCAL BUSINESSES AND DEALS NEAR YOU
      </div>
    </div>
  );
}
