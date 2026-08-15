// @vitest-environment happy-dom

/**
 * The two shared-table behaviours the event tables depend on.
 *
 * Both are the kind of thing that regresses invisibly: the selection line looks
 * harmless when it is wrong, and a generic "No results." is indistinguishable
 * from a correct empty state until the day the read actually fails.
 *
 * Driven with `react-dom/client` + happy-dom, per the repo's component-test
 * convention (@testing-library's peer isn't installed and the stack is frozen).
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  vi,
} from 'vitest';
import type { ColumnDef, Table } from '@tanstack/react-table';
import { DataTable } from '@/components/custom/data-table/DataTable';

beforeAll(() => {
  // Radix's Select (inside the pager) probes matchMedia.
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

interface Row {
  id: string;
  name: string;
}

const DATA: Row[] = [{ id: 'a', name: 'Alpha' }];

const PLAIN_COLUMNS: ColumnDef<Row>[] = [
  { accessorKey: 'name', header: 'Name', cell: ({ row }) => row.original.name },
];

const WITH_SELECT: ColumnDef<Row>[] = [
  { id: 'select', header: '', cell: () => null },
  ...PLAIN_COLUMNS,
];

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(
  columns: ColumnDef<Row>[],
  data: Row[],
  emptyState?: React.ReactNode,
  renderMobile?: (table: Table<Row>) => React.ReactNode,
) {
  act(() => {
    root.render(
      <DataTable
        columns={columns}
        data={data}
        pageCount={1}
        pagination={{ pageIndex: 0, pageSize: 10 }}
        onPaginationChange={vi.fn()}
        sorting={[]}
        onSortingChange={vi.fn()}
        emptyState={emptyState}
        renderMobile={renderMobile}
      />,
    );
  });
  return container.textContent ?? '';
}

describe('the selection count follows the checkbox column', () => {
  it('is shown when the table has one', () => {
    expect(render(WITH_SELECT, DATA)).toContain('row(s) selected');
  });

  it('is absent when it does not', () => {
    // A table with nothing selectable was still printing "0 of 1 row(s)
    // selected", which describes a control that isn't there.
    expect(render(PLAIN_COLUMNS, DATA)).not.toContain('row(s) selected');
  });

  it('still renders the pager either way', () => {
    expect(render(PLAIN_COLUMNS, DATA)).toContain('Rows per page');
  });
});

describe('the empty row', () => {
  it('defaults to "No results."', () => {
    expect(render(PLAIN_COLUMNS, [])).toContain('No results.');
  });

  it('takes the caller’s copy when given', () => {
    // "Couldn't load" and "you have none" are different things to tell someone
    // — this repo has fixed that confusion on three separate surfaces.
    const html = render(
      PLAIN_COLUMNS,
      [],
      <p>We couldn&apos;t load your events</p>,
    );
    expect(html).toContain("We couldn't load your events");
    expect(html).not.toContain('No results.');
  });

  it('is not used when there are rows', () => {
    const html = render(PLAIN_COLUMNS, DATA, <p>Nothing here</p>);
    expect(html).toContain('Alpha');
    expect(html).not.toContain('Nothing here');
  });
});

describe('with a mobile card renderer (§6.8 Layer 2)', () => {
  const CARDS = (table: Table<Row>) => (
    <ul data-testid="mobile-cards">
      {table.getRowModel().rows.map((row) => (
        <li key={row.id} data-testid="mobile-card">
          {row.original.name}
        </li>
      ))}
    </ul>
  );

  // The `md:hidden` wrapper owns the whole mobile slot — it renders either
  // the caller's card list (rows) or the empty state (no rows). The cards
  // `ul` only exists in the former case, so assert on the wrapper's text.
  const mobileWrapper = () => container.querySelector('[class*="md:hidden"]');

  const tableWrapper = () =>
    // The wrapper div that owns the `hidden md:block` switch — the direct
    // parent of the `table-container` the base Table component renders.
    container.querySelector('[data-slot="table-container"]')?.parentElement;

  it('renders the cards from the same row model when there are rows', () => {
    const html = render(PLAIN_COLUMNS, DATA, undefined, CARDS);
    expect(container.querySelector('[data-testid="mobile-cards"]')).not.toBe(
      null,
    );
    expect(html).toContain('Alpha');
  });

  it('keeps the table markup but marks it desktop-only', () => {
    render(PLAIN_COLUMNS, DATA, undefined, CARDS);
    // The regression this fixes: an empty table used to render its full header
    // row into the mobile layout, so a phone scrolled sideways past ten
    // columns just to reach "No results." The wrapper must carry the switch
    // whether or not there are rows.
    expect(tableWrapper()?.className).toContain('hidden md:block');
    expect(mobileWrapper()?.className).toContain('md:hidden');
  });

  it('renders the empty state in the mobile slot instead of the header row', () => {
    const html = render(PLAIN_COLUMNS, [], <p>No products yet</p>, CARDS);
    expect(mobileWrapper()?.textContent).toContain('No products yet');
    expect(html).not.toContain('No results.');
    // The desktop wrapper is still switched off on phones even when empty.
    expect(tableWrapper()?.className).toContain('hidden md:block');
  });

  it('defaults the mobile empty state to the same generic copy', () => {
    render(PLAIN_COLUMNS, [], undefined, CARDS);
    expect(mobileWrapper()?.textContent).toContain('No results.');
  });
});
