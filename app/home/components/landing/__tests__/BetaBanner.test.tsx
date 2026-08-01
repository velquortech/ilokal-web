/**
 * Beta banner: visible, announced to assistive tech, and styled from the
 * landing token system (so it follows the page's dark toggle).
 *
 * The banner is a static component, so renderToStaticMarkup (already shipped
 * with react-dom) is enough — no DOM environment or extra test libs needed.
 */

import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BetaBanner } from '../BetaBanner';

const html = renderToStaticMarkup(<BetaBanner />);

describe('BetaBanner', () => {
  it('renders the beta notice text', () => {
    expect(html).toContain('iLokal is in');
    expect(html).toContain('<strong>beta</strong>');
    expect(html).toContain('rough edges');
  });

  it('is exposed as a status region for screen readers', () => {
    expect(html).toContain('role="status"');
  });

  it('holds its own contrast on the gradient sky', () => {
    // It used to be `--tint` on `--brandhover` — pale text on a pale strip,
    // which over the gradient read as a rendering fault rather than a notice.
    // Fixed Charcoal/Cornsilk instead, so it does not depend on where the
    // blooms happen to sit behind it.
    expect(html).toContain('background:#1A1A1A');
    expect(html).toContain('color:#FEF8D6');
    expect(html).not.toContain('var(--tint)');
  });
});
