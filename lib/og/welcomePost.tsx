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
  /** Absolute URL. Satori fetches this; it cannot read a bucket path. */
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

/** Bounds on the manual size adjuster, so a slider cannot break the layout. */
export const NAME_SCALE_MIN = 0.6;
export const NAME_SCALE_MAX = 1.5;
export const NAME_SCALE_DEFAULT = 1;

export function clampNameScale(value: number): number {
  if (!Number.isFinite(value)) return NAME_SCALE_DEFAULT;
  return Math.min(Math.max(value, NAME_SCALE_MIN), NAME_SCALE_MAX);
}

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

      {card.showName && (
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
      )}
    </div>
  );
}

export interface WelcomePostProps {
  cards: PostCard[];
  ratio: PostRatio;
  /** Absolute URL of the jasmine wordmark cut. */
  wordmarkUrl: string;
  /** Manual multiplier on the name size ladder. */
  nameScale?: number;
}

/**
 * The two tonal circles behind the content.
 *
 * Sized and placed relative to the canvas rather than in fixed pixels, so the
 * 4:5 crop keeps the same composition instead of pinning them to a 1080 square.
 * Both bleed off an edge — a circle fully inside the frame reads as a shape,
 * one that runs off reads as depth.
 *
 * Rendered before the content and never given a z-index: Satori paints in
 * document order, so being first IS being behind.
 */
function Backdrop({ width, height }: { width: number; height: number }) {
  const topSize = Math.round(width * 0.36);
  const bottomSize = Math.round(width * 0.41);

  return (
    <>
      <div
        style={{
          position: 'absolute',
          display: 'flex',
          top: Math.round(height * 0.01),
          left: Math.round(width * 0.64),
          width: topSize,
          height: topSize,
          borderRadius: topSize,
          // Tone on tone. A stronger tint competes with the wordmark sitting
          // over it; the mock's circles are only just visible and that is the
          // point.
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          display: 'flex',
          top: Math.round(height * 0.6),
          left: Math.round(width * -0.07),
          width: bottomSize,
          height: bottomSize,
          borderRadius: bottomSize,
          backgroundColor: 'rgba(0, 0, 0, 0.05)',
        }}
      />
    </>
  );
}

export function WelcomePost({
  cards,
  ratio,
  wordmarkUrl,
  nameScale = NAME_SCALE_DEFAULT,
}: WelcomePostProps) {
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={wordmarkUrl} width={Math.round(width * 0.3)} alt="iLokal" />
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
            fontSize: Math.round(width * 0.024),
            marginTop: Math.round(height * 0.008),
          }}
        >
          Find them on ilokal.shop
        </div>
      </div>
    </div>
  );
}
