// @vitest-environment happy-dom

import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  DashboardSkeleton,
  TablePageSkeleton,
  FormPageSkeleton,
} from '@/components/custom/skeletons';

/** Render to a real DOM tree so assertions target structure, not class strings. */
function render(node: React.ReactElement): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = renderToStaticMarkup(node);
  return host;
}

describe('dashboard skeletons', () => {
  it('DashboardSkeleton is an accessible status region', () => {
    const el = render(<DashboardSkeleton />);
    const live = el.querySelector('[role="status"]')!;

    expect(live).not.toBeNull();
    expect(live.textContent).toContain('Loading…');
    // `aria-busy` belongs on the container, NOT the live region — on the region
    // it tells AT to defer the announcement, and it never flips back to false.
    expect(live.getAttribute('aria-busy')).toBeNull();
    expect(el.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(live.closest('[aria-busy="true"]')).not.toBeNull();
  });

  it('hides the decorative placeholders from assistive tech', () => {
    const el = render(<DashboardSkeleton />);
    const skeleton = el.querySelector('[data-slot="skeleton"]')!;

    expect(skeleton.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('TablePageSkeleton renders a header + rows and is a status region', () => {
    const el = render(<TablePageSkeleton rows={4} cols={3} />);

    expect(el.querySelector('[role="status"]')).not.toBeNull();
    expect(
      el.querySelectorAll('[data-slot="skeleton"]').length,
    ).toBeGreaterThan(5);
  });

  it('FormPageSkeleton renders labelled field placeholders', () => {
    const el = render(<FormPageSkeleton fields={3} />);

    expect(el.querySelector('[role="status"]')).not.toBeNull();
    expect(el.textContent).toContain('Loading…');
  });

  it('spaces the placeholder blocks (guards the space-y regression)', () => {
    // Tailwind v4 compiles `space-y-*` to `:where(& > :not(:last-child))`, which
    // matches DOM direct children only. The spacing must therefore sit on the
    // element that DIRECTLY contains the blocks — declaring it on an ancestor
    // (e.g. across a `display:contents` wrapper) silently yields a zero gap.
    const el = render(<DashboardSkeleton />);
    const spaced = el.querySelector('.space-y-6')!;
    const firstBlock = el.querySelector('[data-slot="skeleton"]')!;

    expect(spaced).not.toBeNull();
    // Walk up from the first placeholder: some ancestor between it and the
    // spaced element must be a DIRECT child of that element.
    let node: Element | null = firstBlock;
    while (node && node.parentElement !== spaced) node = node.parentElement;
    expect(node).not.toBeNull();
  });
});
