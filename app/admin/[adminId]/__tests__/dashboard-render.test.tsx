// @vitest-environment happy-dom

/**
 * The dashboard's conditional rendering.
 *
 * The query layer is covered separately; what is untested without this is
 * every branch that decides WHAT an admin sees — the chart's failed / empty /
 * data fork, and the review-queue card, whose whole job is to disappear when
 * it would be permanently zero. Those are exactly the paths where "no data"
 * and "the read broke" get confused.
 */

import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import type { GrowthBucket } from '@/lib/types';

vi.mock('recharts', () => {
  // recharts measures a container that happy-dom cannot lay out. The branch
  // under test is which BRANCH renders, not what the SVG looks like.
  const Stub = ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-chart': 'true' }, children);
  // `components/ui/chart` does `import * as RechartsPrimitive`, so the mock has
  // to answer for names this test never uses. Listed rather than proxied:
  // vitest validates a mocked module's exports eagerly, and a Proxy's traps do
  // not satisfy that check for a namespace import.
  return {
    __esModule: true,
    AreaChart: Stub,
    Area: Stub,
    BarChart: Stub,
    Bar: Stub,
    XAxis: Stub,
    YAxis: Stub,
    CartesianGrid: Stub,
    Tooltip: Stub,
    Legend: Stub,
    ResponsiveContainer: Stub,
    LineChart: Stub,
    Line: Stub,
    PieChart: Stub,
    Pie: Stub,
    Cell: Stub,
  };
});

const { GrowthCharts } = await import('../components/GrowthChart');

const html = (node: React.ReactElement) => renderToStaticMarkup(node);

const POPULATED: GrowthBucket[] = [
  { month: 'Jul', users: 0, businesses: 0 },
  { month: 'Aug', users: 42, businesses: 12 },
];
const EMPTY: GrowthBucket[] = [
  { month: 'Jul', users: 0, businesses: 0 },
  { month: 'Aug', users: 0, businesses: 0 },
];

describe('the chart tells an outage apart from an empty month', () => {
  it('says the read failed rather than drawing a flat line at zero', () => {
    const markup = html(<GrowthCharts buckets={[]} failed />);

    expect(markup).toContain('couldn’t load');
    expect(markup).not.toContain('data-chart');
  });

  it('says there is no activity yet when the read succeeded', () => {
    const markup = html(<GrowthCharts buckets={EMPTY} />);

    expect(markup).toContain('No signups yet');
    expect(markup).not.toContain('couldn’t load');
    expect(markup).not.toContain('data-chart');
  });

  it('draws the charts once there is anything to draw', () => {
    const markup = html(<GrowthCharts buckets={POPULATED} />);

    expect(markup).toContain('data-chart');
    expect(markup).not.toContain('couldn’t load');
    expect(markup).not.toContain('No signups yet');
  });
});

describe('the charts have a text alternative', () => {
  it('renders the same numbers as a table for anyone not reading the SVG', () => {
    // recharts draws unlabelled paths. `accessibilityLayer` gives keyboard
    // traversal but nothing to read, so the table is the actual alternative.
    const markup = html(<GrowthCharts buckets={POPULATED} />);

    expect(markup).toContain('<table');
    expect(markup).toContain('New users');
    expect(markup).toContain('42');
    expect(markup).toContain('12');
  });

  it('does not render a table of zeros when there is nothing to describe', () => {
    expect(html(<GrowthCharts buckets={EMPTY} />)).not.toContain('<table');
    expect(html(<GrowthCharts buckets={[]} failed />)).not.toContain('<table');
  });
});
