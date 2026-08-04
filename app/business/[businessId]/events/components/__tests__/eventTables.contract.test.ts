/**
 * The two event tables, as a contract.
 *
 * Source-level, deliberately. What is being pinned here is not what one render
 * happens to produce — it is the set of decisions that make these tables the
 * same tables as everything else in the dashboard, each of which is invisible
 * once broken:
 *
 * - a status picker that offers a value the DB rejects (the exact bug that made
 *   the catalogue's "Set Status" silently do nothing for weeks),
 * - a menu that offers an owner a decision the trigger will revert,
 * - a checkbox column reappearing, which on the review queue would mean bulk
 *   approval — the one thing the approval gate exists to prevent,
 * - a bespoke list growing back beside the shared `DataTable`.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EVENT_STATUSES, EVENT_STATUS_OPTIONS } from '@/lib/types';
import { eventStatusLabel } from '@/components/custom/events/EventStatusBadge';

const ROOT = join(__dirname, '../../../../../..');
const read = (relative: string) => readFileSync(join(ROOT, relative), 'utf8');

const OWNER_DIR = 'app/business/[businessId]/events/components';
const ADMIN_DIR = 'app/admin/[adminId]/events/components';

describe('the status vocabulary is one list', () => {
  it('covers exactly the DB CHECK, once each', () => {
    const values = EVENT_STATUS_OPTIONS.map((o) => o.value);
    expect(new Set(values).size).toBe(values.length);
    expect([...values].sort()).toEqual([...EVENT_STATUSES].sort());
  });

  it('labels every status, and never renders the raw column value', () => {
    for (const status of EVENT_STATUSES) {
      const label = eventStatusLabel(status);
      expect(label.length).toBeGreaterThan(0);
      // "pending_review" is a column value, not something to show a shop.
      expect(label).not.toBe(status);
    }
  });

  it('the filter reads the shared list rather than literals', () => {
    const source = read('components/custom/events/FilterEvents.tsx');
    expect(source).toContain('EVENT_STATUS_OPTIONS');
    for (const status of EVENT_STATUSES) {
      expect(source).not.toMatch(new RegExp(`value=["']${status}["']`));
    }
  });
});

describe("the owner's row menu offers only moves the owner has", () => {
  const source = read(`${OWNER_DIR}/event-table/event-actions.tsx`);

  it('moves an event only to draft or pending_review', () => {
    // Reading `status === 'approved'` to decide what to render is fine; SETTING
    // it is not — the trigger reverts either decision from a non-admin, so a
    // menu entry for one would be a control that silently does nothing.
    const moved = [...source.matchAll(/move\(\s*'([a-z_]+)'/g)].map(
      (match) => match[1],
    );

    expect(moved.length).toBeGreaterThan(0);
    expect(new Set(moved)).toEqual(new Set(['draft', 'pending_review']));
  });

  it('routes every status move through setEventStatusAction', () => {
    expect(source).toContain('setEventStatusAction');
    // The action's own type only admits the two, and the schema refuses the
    // rest server-side; nothing else may call the service directly.
    expect(source).not.toContain('setOwnerEventStatus');
  });

  it('passes the shop id to every write', () => {
    // Without it the action falls back to whichever shop `.limit(1)` returns.
    expect(source).toContain('setEventStatusAction(businessId,');
  });
});

describe('both tables are the shared table', () => {
  const TABLES = [
    `${OWNER_DIR}/event-table/events-table.tsx`,
    `${ADMIN_DIR}/event-review-table/events-review-table.tsx`,
  ];

  it.each(TABLES)('%s renders DataTable', (relative) => {
    const source = read(relative);
    expect(source).toContain("from '@/components/custom/data-table/DataTable'");
    expect(source).toContain('<DataTable');
  });

  it.each(TABLES)('%s declares no selection column', (relative) => {
    // Bulk-approving is exactly what the approval gate exists to prevent, and
    // the owner's four states are per-event decisions.
    expect(read(relative)).not.toContain('selection=');
  });

  it.each(TABLES)(
    '%s distinguishes an outage from an empty list',
    (relative) => {
      const source = read(relative);
      expect(source).toContain('loadFailed');
      expect(source).toContain('emptyState');
    },
  );

  it.each([
    `${OWNER_DIR}/event-table/columns.tsx`,
    `${ADMIN_DIR}/event-review-table/columns.tsx`,
  ])('%s has no checkbox column', (relative) => {
    expect(read(relative)).not.toMatch(/id:\s*'select'/);
  });
});

describe('the admin can author, but cannot silently take a shop event down', () => {
  const actions = read(`${ADMIN_DIR}/event-review-table/review-actions.tsx`);

  it('gates Edit and Remove on the event being a staff pick', () => {
    expect(actions).toContain('business_id === null');
    // Absent, not disabled: a greyed-out control would suggest an admin could.
    expect(actions).toContain('{isStaffPick && (');
  });

  it('keeps approve and reject behind their dialogs', () => {
    // A rejection needs a reason, and the action refuses one without it, so a
    // one-click menu entry would fail every time.
    expect(actions).toContain('DecisionDialog');
  });

  it('offers the staff-pick dialog from the page header', () => {
    expect(read(`${ADMIN_DIR}/event-review-content.tsx`)).toContain(
      'StaffPickDialog',
    );
  });
});

describe('a search box does not eat what is typed into it', () => {
  const CONTENTS = [
    `${OWNER_DIR}/events-content.tsx`,
    `${ADMIN_DIR}/event-review-content.tsx`,
  ];

  it.each(CONTENTS)('%s ignores the navigation it caused', (relative) => {
    const source = read(relative);
    // Without this the debounce landing mid-typing resets the input to the URL
    // value and deletes every character typed during the round-trip — the bug
    // already fixed once in `app/explore/components/explore-content.tsx`.
    expect(source).toContain('lastPushedSearch');
    expect(source).toContain('lastPushedSearch.current = searchInput');
  });
});

describe('the form is not forked', () => {
  it.each([
    `${OWNER_DIR}/event-dialog.tsx`,
    `${ADMIN_DIR}/staff-pick-dialog.tsx`,
  ])('%s wraps the shared EventFormDialog', (relative) => {
    expect(read(relative)).toContain(
      "from '@/components/custom/events/EventFormDialog'",
    );
  });

  it('a staff pick has no draft state and no offering picker', () => {
    const wrapper = read(`${ADMIN_DIR}/staff-pick-dialog.tsx`);
    expect(wrapper).not.toContain('offerings');

    const shared = read('components/custom/events/EventFormDialog.tsx');
    // The draft button renders only for a variant that declares one.
    expect(shared).toContain('copy.draftSubmit');
  });

  it('seeds on OPEN, never from an effect watching the row object', () => {
    const shared = read('components/custom/events/EventFormDialog.tsx');

    // The tables hand down a new `event` object on every `router.refresh()` —
    // which any sibling row's status move triggers. An effect keyed on that
    // object reset the form under someone mid-edit and threw their work away.
    expect(shared).toContain('onOpenChange={handleOpenChange}');
    expect(shared).not.toMatch(/\}, \[open, event\]\)/);
  });
});
