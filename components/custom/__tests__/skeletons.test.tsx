import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  DashboardSkeleton,
  TablePageSkeleton,
  FormPageSkeleton,
} from '@/components/custom/skeletons';

describe('dashboard skeletons', () => {
  it('DashboardSkeleton is an accessible status region', () => {
    const html = renderToStaticMarkup(<DashboardSkeleton />);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('Loading…');
  });

  it('TablePageSkeleton renders a header + rows and is a status region', () => {
    const html = renderToStaticMarkup(<TablePageSkeleton rows={4} cols={3} />);
    expect(html).toContain('role="status"');
    // data-slot from the Skeleton primitive — several present for header + rows
    const skeletons = html.split('data-slot="skeleton"').length - 1;
    expect(skeletons).toBeGreaterThan(5);
  });

  it('FormPageSkeleton renders labelled field placeholders', () => {
    const html = renderToStaticMarkup(<FormPageSkeleton fields={3} />);
    expect(html).toContain('role="status"');
    expect(html).toContain('Loading…');
  });

  it('announces only the label — placeholders are hidden from AT', () => {
    const html = renderToStaticMarkup(<DashboardSkeleton />);
    // The live region carries the label and nothing else.
    expect(html).toContain('role="status" aria-busy="true" class="sr-only"');
    expect(html).toContain('aria-hidden="true"');
  });

  it('spaces the placeholder blocks (guards the space-y regression)', () => {
    // Tailwind v4 compiles `space-y-*` to `:where(& > :not(:last-child))`, which
    // only matches DOM direct children. The spacing MUST live on the element
    // that directly contains the blocks — putting it on an ancestor separated
    // by a `display:contents` wrapper silently yields zero gap.
    const html = renderToStaticMarkup(<DashboardSkeleton />);
    expect(html).toContain(
      'aria-hidden="true" class="flex flex-1 flex-col space-y-6"',
    );
    expect(html).not.toContain('class="contents"');
  });
});
