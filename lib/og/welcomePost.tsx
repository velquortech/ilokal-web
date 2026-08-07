import { POST_FONT_FAMILY } from './fonts';

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

/**
 * Font size for a name, keyed on its length.
 *
 * The live names run 3 to 29 characters — `LU2` against
 * `Suds & Sips Carwash and Café`. One size cannot serve a ten-times spread:
 * the long one overflows its card and the short one looks lost. The floor
 * stops a two-character name rendering comically large.
 */
export function nameFontSize(name: string, cardWidth: number): number {
  const length = displayName(name).length;
  const scale =
    length <= 8 ? 0.105 : length <= 14 ? 0.088 : length <= 20 ? 0.07 : 0.055;
  return Math.round(cardWidth * scale);
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

function Card({
  card,
  fill,
  size,
}: {
  card: PostCard;
  fill: string;
  size: number;
}) {
  const pad = Math.round(size * 0.08);
  const logoBox = size - pad * 2;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: size,
        height: card.showName ? size * 1.16 : size,
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
            color: CHARCOAL,
            fontFamily: POST_FONT_FAMILY,
            fontWeight: 700,
            fontSize: nameFontSize(card.name, size),
            lineHeight: 1.05,
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
}

export function WelcomePost({ cards, ratio, wordmarkUrl }: WelcomePostProps) {
  const { width, height } = POST_RATIOS[ratio];
  const shown = cards.slice(0, 2);

  // One card gets the space two would share, so a single shop is a deliberate
  // layout rather than a two-up with a hole in it.
  const cardSize =
    shown.length === 1 ? Math.round(width * 0.52) : Math.round(width * 0.4);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        width,
        height,
        backgroundColor: BRICK,
        paddingTop: Math.round(height * 0.055),
        paddingBottom: Math.round(height * 0.045),
        fontFamily: POST_FONT_FAMILY,
      }}
    >
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
