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

  it('uses landing CSS variables so it tracks the dark-mode toggle', () => {
    expect(html).toContain('background:var(--tint)');
    expect(html).toContain('color:var(--brandhover)');
  });
});
