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
});
