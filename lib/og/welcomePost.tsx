/**
 * The display family the layout asks for.
 *
 * Declared HERE rather than in `fonts.ts` so this module stays importable from
 * a client component: `fonts.ts` reads the font files and therefore pulls in
 * `node:fs`, which Turbopack refuses to bundle for the browser. The admin
 * composer imports the scale bounds below, so that mattered.
 */
export const POST_FONT_FAMILY = 'PostDisplay';

/**
 * The "Welcome to the iLokal family!" post.
 *
 * Rebuilt as flexbox rather than ported: Satori supports a CSS subset with no
 * grid, no float and limited positioning, so the mock's layout is expressed in
 * nested flex or not at all.
 */

/** Brand palette, from DESIGN.md. Raw hex because this is not a themed surface. */
const BRICK = '#D70005';
const JASMINE = '#FEE87B';
const CORNSILK = '#FEF8D6';
const CHARCOAL = '#1A1A1A';
const WHITE = '#FFFFFF';

/** Card fills, alternating as in the mock. */
const CARD_FILLS = [CORNSILK, JASMINE];

export const POST_RATIOS = {
  '1x1': { width: 1080, height: 1080, label: 'Square (1:1)' },
  '4x5': { width: 1080, height: 1350, label: 'Portrait (4:5)' },
} as const;

export type PostRatio = keyof typeof POST_RATIOS;

export interface PostCard {
  name: string;
  /**
   * A `data:image/png` URL, or null for the initials card.
   *
   * ⚠️ PNG specifically, and a data URL specifically. The renderer cannot parse
   * WebP — which is every logo the app stores — and letting it fetch a remote
   * URL itself means an un-timed-out request to a host an owner chose. Both are
   * resolved in `lib/og/remoteImage.ts` before the render starts.
   */
  logoUrl: string | null;
  /** Off when the logo is already a wordmark carrying the name. */
  showName: boolean;
}

/**
 * Display form of a shop name.
 *
 * Three of the fourteen live names carry a trailing space, which visibly
 * breaks centring, and three are already ALL CAPS — so the transform is
 * applied to every name rather than to the ones that look like they need it.
 */
export function displayName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().toUpperCase();
}

/** The name may wrap to this many lines before the box clips it. */
export const NAME_MAX_LINES = 2;
export const NAME_LINE_HEIGHT = 1.08;

/**
 * The text zones an admin can resize.
 *
 * A record rather than a pair of hand-rolled constants: name and footer today,
 * and the headline and eyebrow are the obvious next asks. One entry adds a
 * zone; the route, the query schema and the UI all iterate this, so a third
 * scale is a line rather than a third copy of the same plumbing.
 */
export const TEXT_SCALES = {
  name: {
    label: 'Shop name',
    hint: 'Long names wrap to two lines',
    param: 'nameScale',
  },
  footer: {
    label: 'Footer lines',
    hint: '“Thank you…” and “Find them on ilokal.shop”',
    param: 'footerScale',
  },
} as const;

export type TextScaleKey = keyof typeof TEXT_SCALES;

export const SCALE_MIN = 0.6;
export const SCALE_MAX = 1.5;
export const SCALE_DEFAULT = 1;

export type TextScales = Record<TextScaleKey, number>;

export const DEFAULT_TEXT_SCALES: TextScales = {
  name: SCALE_DEFAULT,
  footer: SCALE_DEFAULT,
};

/**
 * Bring a scale into range.
 *
 * Applied server-side as well as bounded in the UI: the slider cannot go out
 * of range, but this is also a query parameter and a caller can send anything —
 * including nothing, which is why `undefined` is in the signature rather than
 * being defaulted at each call site.
 */
export function clampScale(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return SCALE_DEFAULT;
  return Math.min(Math.max(value, SCALE_MIN), SCALE_MAX);
}

/** Kept for the existing call sites and tests; the name zone's clamp. */
export const clampNameScale = clampScale;
export const NAME_SCALE_MIN = SCALE_MIN;
export const NAME_SCALE_MAX = SCALE_MAX;
export const NAME_SCALE_DEFAULT = SCALE_DEFAULT;

/**
 * Font size for a name, keyed on its length.
 *
 * The live names run 3 to 29 characters — `LU2` against
 * `Suds & Sips Carwash and Café`. One size cannot serve a ten-times spread.
 *
 * The long buckets are deliberately generous now that the name may take TWO
 * lines: squeezing a 29-character name onto one line set it at roughly half
 * the size of its neighbour, which read as a mistake rather than as a long
 * name. Wrapping costs a line and buys back the weight.
 *
 * `scale` is the manual adjuster — the ladder picks a sane default and an
 * admin overrides it per post, because how big a name should be depends on
 * the logo sitting above it, which no rule can know.
 */
export function nameFontSize(
  name: string,
  cardWidth: number,
  scale: number = NAME_SCALE_DEFAULT,
): number {
  const length = displayName(name).length;
  const ratio =
    length <= 8 ? 0.105 : length <= 14 ? 0.09 : length <= 20 ? 0.08 : 0.072;
  return Math.round(cardWidth * ratio * clampNameScale(scale));
}

/** Up to two letters, for a card whose logo could not be fetched. */
export function initials(name: string): string {
  const words = displayName(name).split(' ').filter(Boolean);
  if (words.length === 0) return '?';
  // First + last, so "Suds & Sips Carwash and Café" reads SC rather than SS.
  const first = [...words[0]][0] ?? '';
  const last = words.length > 1 ? ([...words[words.length - 1]][0] ?? '') : '';
  return first + last || '?';
}

/**
 * The name box height a PAIR of cards should share.
 *
 * Sized from the largest name in the pair, not per card. Each card sizing its
 * own box makes a short name (bigger font, taller box) produce a taller card
 * than a long one beside it — the cards sit at different heights and the pair
 * reads as broken. Computed once at the parent and handed down.
 */
export function sharedNameBoxHeight(
  cards: PostCard[],
  cardSize: number,
  nameScale: number,
): number {
  const sizes = cards
    .filter((card) => card.showName)
    .map((card) => nameFontSize(card.name, cardSize, nameScale));
  if (sizes.length === 0) return 0;
  return Math.round(Math.max(...sizes) * NAME_LINE_HEIGHT * NAME_MAX_LINES);
}

function Card({
  card,
  fill,
  size,
  nameScale,
  nameBoxHeight,
}: {
  card: PostCard;
  fill: string;
  size: number;
  nameScale: number;
  /** Shared across the pair — see `sharedNameBoxHeight`. */
  nameBoxHeight: number;
}) {
  const pad = Math.round(size * 0.08);
  const logoBox = size - pad * 2;
  const fontSize = nameFontSize(card.name, size, nameScale);
  const gap = card.showName ? Math.round(size * 0.04) : 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: size,
        height: pad * 2 + logoBox + gap + nameBoxHeight,
        backgroundColor: fill,
        borderRadius: Math.round(size * 0.09),
        padding: pad,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: logoBox,
          height: logoBox,
        }}
      >
        {card.logoUrl ? (
          // `contain`, never `cover`: a logo is not a photograph and cropping
          // one is worse than letterboxing it.
          //
          // A raw <img>, and it has to be: this tree is rendered by Satori into
          // a PNG, never by the browser, so next/image has nothing to optimise
          // and its runtime is not present here.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.logoUrl}
            width={logoBox}
            height={logoBox}
            style={{ objectFit: 'contain' }}
            alt=""
          />
        ) : (
          // A single unreachable logo would otherwise fail the whole render.
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: logoBox,
              height: logoBox,
              color: CHARCOAL,
              fontFamily: POST_FONT_FAMILY,
              fontWeight: 700,
              fontSize: Math.round(logoBox * 0.4),
              opacity: 0.55,
            }}
          >
            {initials(card.name)}
          </div>
        )}
      </div>

      {card.showName ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: logoBox,
            // Fixed to exactly two lines: a third would push past the card,
            // and Satori has no reliable line-clamp to fall back on.
            height: nameBoxHeight,
            overflow: 'hidden',
            color: CHARCOAL,
            fontFamily: POST_FONT_FAMILY,
            fontWeight: 700,
            fontSize,
            lineHeight: NAME_LINE_HEIGHT,
            textAlign: 'center',
          }}
        >
          {displayName(card.name)}
        </div>
      ) : (
        // An EMPTY box of the same height, not nothing.
        //
        // `nameBoxHeight` is the pair's shared value and is already in this
        // card's fixed height, so omitting the element entirely leaves
        // `space-between` with one child — which pins the logo to the top and
        // opens a band of dead space where the sibling's name sits. With the
        // spacer present the logo stays centred and the two cards still end
        // level, which is what the shared height is for.
        <div
          style={{ display: 'flex', width: logoBox, height: nameBoxHeight }}
        />
      )}
    </div>
  );
}

export interface WelcomePostProps {
  cards: PostCard[];
  ratio: PostRatio;
  /**
   * The jasmine wordmark as a `data:` URL.
   *
   * Nullable because it is read off disk and a decorative lockup is not worth
   * failing an image over. Inlined rather than fetched: any URL would have to
   * come from an env var that is genuinely unset in some deploys, or from
   * `request.nextUrl.origin`, which is `Host`-derived and attacker-controlled.
   */
  wordmarkUrl: string | null;
  /** Manual multipliers per text zone. */
  scales?: Partial<TextScales>;
}

/**
 * Circles behind the content.
 *
 * Positioned as fractions of the canvas rather than in pixels, so the 4:5 crop
 * keeps the composition instead of pinning them to a 1080 square.
 *
 * Two rules hold the set together. Every circle bleeds off an edge or sits
 * behind a card — one floating loose in open space reads as a stray shape
 * rather than as depth. And nothing sits under the headline: the copy is white
 * on Brick Ember and a tint beneath it costs contrast on the one thing that
 * must stay legible.
 *
 * Rendered before the content and given no z-index, since Satori paints in
 * document order.
 */
export const BACKDROP_CIRCLES = [
  // The template's two, kept as the anchors of the composition.
  { x: 0.64, y: 0.01, size: 0.36, tint: 'rgba(255, 255, 255, 0.05)' },
  { x: -0.07, y: 0.6, size: 0.41, tint: 'rgba(0, 0, 0, 0.05)' },
  // Smaller companions, all cropped by an edge.
  { x: -0.12, y: 0.02, size: 0.2, tint: 'rgba(255, 255, 255, 0.035)' },
  { x: 0.86, y: 0.42, size: 0.26, tint: 'rgba(0, 0, 0, 0.04)' },
  { x: 0.72, y: 0.82, size: 0.22, tint: 'rgba(255, 255, 255, 0.04)' },
  { x: -0.04, y: 0.32, size: 0.14, tint: 'rgba(255, 255, 255, 0.03)' },
] as const;

function Backdrop({ width, height }: { width: number; height: number }) {
  return (
    <>
      {BACKDROP_CIRCLES.map((circle, index) => {
        const size = Math.round(width * circle.size);
        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              display: 'flex',
              top: Math.round(height * circle.y),
              left: Math.round(width * circle.x),
              width: size,
              height: size,
              borderRadius: size,
              backgroundColor: circle.tint,
            }}
          />
        );
      })}
    </>
  );
}

export function WelcomePost({
  cards,
  ratio,
  wordmarkUrl,
  scales,
}: WelcomePostProps) {
  const nameScale = clampScale(scales?.name ?? SCALE_DEFAULT);
  const footerScale = clampScale(scales?.footer ?? SCALE_DEFAULT);
  const { width, height } = POST_RATIOS[ratio];
  const shown = cards.slice(0, 2);

  // One card gets the space two would share, so a single shop is a deliberate
  // layout rather than a two-up with a hole in it.
  const cardSize =
    shown.length === 1 ? Math.round(width * 0.52) : Math.round(width * 0.4);

  // One measurement for the pair, so both cards end at the same height.
  const nameBox = sharedNameBoxHeight(shown, cardSize, nameScale);

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
        paddingTop: Math.round(height * 0.055),
        paddingBottom: Math.round(height * 0.045),
        fontFamily: POST_FONT_FAMILY,
      }}
    >
      <Backdrop width={width} height={height} />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* The wordmark is drawn lettering — never the literal text "iLokal".
            Raw <img> for the same reason as the logo above: Satori renders
            this, not the browser. */}
        {/* Absent rather than broken when the asset could not be read: the
            wordmark must never be typeset as text, so there is no fallback to
            substitute — the lockup simply does not appear. */}
        {wordmarkUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={wordmarkUrl} width={Math.round(width * 0.3)} alt="iLokal" />
        )}
        <div
          style={{
            display: 'flex',
            color: JASMINE,
            fontWeight: 700,
            fontSize: Math.round(width * 0.028),
            letterSpacing: Math.round(width * 0.006),
            marginTop: Math.round(height * 0.018),
          }}
        >
          NEW ON ILOKAL
        </div>
        <div
          style={{
            display: 'flex',
            color: WHITE,
            fontWeight: 700,
            fontSize: Math.round(width * 0.072),
            lineHeight: 1.12,
            textAlign: 'center',
            marginTop: Math.round(height * 0.012),
            maxWidth: Math.round(width * 0.78),
          }}
        >
          Welcome to the iLokal family!
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          gap: Math.round(width * 0.045),
        }}
      >
        {shown.map((card, index) => (
          <Card
            key={`${card.name}-${index}`}
            card={card}
            fill={CARD_FILLS[index % CARD_FILLS.length]}
            size={cardSize}
            nameScale={nameScale}
            nameBoxHeight={nameBox}
          />
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            color: WHITE,
            fontWeight: 700,
            fontSize: Math.round(width * 0.026),
          }}
        >
          Thank you for trusting iLokal.
        </div>
        <div
          style={{
            display: 'flex',
            color: JASMINE,
            fontWeight: 700,
            fontSize: Math.round(width * 0.024 * footerScale),
            marginTop: Math.round(height * 0.008),
          }}
        >
          Find them on ilokal.shop
        </div>
      </div>
    </div>
  );
}
